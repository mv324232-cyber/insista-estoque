import { Protegido } from "@/components/auth";
import { ShellAdmin } from "@/components/shell-admin";

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <Protegido papeis={["admin"]}>
      <ShellAdmin>{children}</ShellAdmin>
    </Protegido>
  );
}
