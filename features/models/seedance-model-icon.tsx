import Image from "next/image";
import byteDanceIcon from "@lobehub/icons-static-svg/icons/bytedance-color.svg";

export function SeedanceModelIcon() {
  return <span className="model-icon seedance"><Image src={byteDanceIcon} alt="" width={26} height={26} /></span>;
}
