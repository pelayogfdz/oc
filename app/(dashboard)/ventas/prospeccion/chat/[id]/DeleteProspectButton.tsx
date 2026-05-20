"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteProspectButton({ prospectId }: { prospectId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm("¿Está seguro que desea eliminar este prospecto y todo su historial de mensajes de WhatsApp permanentemente? Esta acción no se puede deshacer.")) {
      setIsDeleting(true);
      try {
        const res = await fetch(`/api/prospects/${prospectId}`, {
          method: "DELETE"
        });
        if (res.ok) {
          alert("Prospecto eliminado exitosamente.");
          router.push("/ventas/prospeccion");
          router.refresh();
        } else {
          alert("Error al eliminar el prospecto");
          setIsDeleting(false);
        }
      } catch (e) {
        console.error(e);
        alert("Error de conexión");
        setIsDeleting(false);
      }
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      title="Eliminar prospecto"
      style={{
        padding: '0.4rem 0.8rem',
        backgroundColor: '#ef4444',
        color: 'white',
        borderRadius: '8px',
        border: 'none',
        fontWeight: 'bold',
        fontSize: '0.875rem',
        cursor: isDeleting ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        opacity: isDeleting ? 0.7 : 1
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
      {isDeleting ? "Eliminando..." : "Eliminar"}
    </button>
  );
}
