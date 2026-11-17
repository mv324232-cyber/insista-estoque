import type { Metadata } from "next";
import { Protegido } from "@/components/auth";

export const metadata: Metadata = { title: "Vender" };

export default function LayoutVender({ children }: LayoutProps<"/vender">) {
  return <Protegido papeis={["vendedor", "admin"]}>{children}</Protegido>;
}
