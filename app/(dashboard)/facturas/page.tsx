import { redirect } from "next/navigation";

export default function FacturasRedirectPage() {
  // Redirigir por defecto a la página principal de facturas de ventas individuales
  redirect("/facturas/ventas");
}
