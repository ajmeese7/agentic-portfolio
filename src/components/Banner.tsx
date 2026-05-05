import Image from "next/image";
import aaron from "../../public/aaron.png";
import meese from "../../public/meese.png";

export function Banner() {
  return (
    <h1
      aria-label="aaron meese"
      className="select-none flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      <Image src={aaron} alt="aaron" priority className="w-40 sm:w-56 md:w-64 lg:w-72 h-auto" />
      <Image src={meese} alt="meese" priority className="w-36 sm:w-48 md:w-56 lg:w-64 h-auto" />
    </h1>
  );
}
