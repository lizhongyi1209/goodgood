#!/usr/bin/env bash
set -euo pipefail

readonly admin_user="goodgood"
readonly swap_file="/swapfile"
readonly swap_size_mib="2048"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this host bootstrap through sudo." >&2
  exit 77
fi

if [[ ! -r /etc/os-release ]]; then
  echo "Cannot identify the host operating system." >&2
  exit 69
fi

# shellcheck disable=SC1091
source /etc/os-release
if [[ "${ID:-}" != "ubuntu" || "${VERSION_ID:-}" != "24.04" ]]; then
  echo "This bootstrap accepts only Ubuntu 24.04." >&2
  exit 78
fi

if ! id "${admin_user}" >/dev/null 2>&1; then
  echo "Required non-root administrator ${admin_user} does not exist." >&2
  exit 78
fi

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

apt-get update
apt-get upgrade --with-new-pkgs --yes
apt-get install --yes \
  ca-certificates \
  curl \
  git \
  gnupg \
  jq \
  nginx \
  unattended-upgrades \
  ufw \
  xz-utils

# Nginx must not publish the distribution placeholder before the reviewed
# staging virtual host and TLS origin are installed.
systemctl disable --now nginx

conflicting_packages=(
  docker.io
  docker-compose
  docker-compose-v2
  docker-doc
  docker-buildx
  podman-docker
  containerd
  runc
)
installed_conflicts=()
for package_name in "${conflicting_packages[@]}"; do
  if dpkg-query --show --showformat='${db:Status-Status}' "${package_name}" 2>/dev/null \
    | grep -qx installed; then
    installed_conflicts+=("${package_name}")
  fi
done
if [[ "${#installed_conflicts[@]}" -gt 0 ]]; then
  apt-get remove --yes "${installed_conflicts[@]}"
fi

install -m 0755 -d /etc/apt/keyrings
curl \
  --fail \
  --location \
  --silent \
  --show-error \
  https://download.docker.com/linux/ubuntu/gpg \
  --output /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

cat >/etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-${VERSION_CODENAME}}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

apt-get update
apt-get install --yes \
  containerd.io \
  docker-buildx-plugin \
  docker-ce \
  docker-ce-cli \
  docker-compose-plugin

install -m 0755 -d /etc/docker
cat >/etc/docker/daemon.json <<'EOF'
{
  "live-restore": true,
  "log-driver": "local",
  "log-opts": {
    "max-file": "3",
    "max-size": "10m"
  }
}
EOF

systemctl enable --now containerd.service docker.service
systemctl restart docker.service
usermod -aG docker "${admin_user}"

if [[ ! -e "${swap_file}" ]]; then
  if ! fallocate --length "${swap_size_mib}M" "${swap_file}"; then
    dd if=/dev/zero of="${swap_file}" bs=1M count="${swap_size_mib}" status=progress
  fi
  chmod 0600 "${swap_file}"
  mkswap "${swap_file}"
fi
if ! swapon --show=NAME --noheadings | grep -Fxq "${swap_file}"; then
  swapon "${swap_file}"
fi
if ! grep -Eq '^/swapfile[[:space:]]+none[[:space:]]+swap[[:space:]]' /etc/fstab; then
  printf '%s\n' '/swapfile none swap sw 0 0' >>/etc/fstab
fi

rm -f /etc/sysctl.d/99-goodgood-host.conf
cat >/etc/sysctl.d/99-zz-goodgood-host.conf <<'EOF'
vm.vfs_cache_pressure=50
EOF
sed -i -E \
  -e '/^# GoodGood host swap policy$/d' \
  -e '/^[[:space:]]*vm\.swappiness[[:space:]]*=/d' \
  /etc/sysctl.conf
printf '%s\n' '# GoodGood host swap policy' 'vm.swappiness=10' >>/etc/sysctl.conf
sysctl --system >/dev/null

cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

docker info >/dev/null
docker compose version >/dev/null
nginx -t

printf 'host_bootstrap=passed\n'
if [[ -f /var/run/reboot-required ]]; then
  printf 'reboot_required=true\n'
else
  printf 'reboot_required=false\n'
fi
