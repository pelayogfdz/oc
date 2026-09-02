import { getCreditNotesAction } from '@/app/actions/creditNote';
import NotasCreditoClient from './NotasCreditoClient';

export default async function NotasCreditoPage() {
  const result = await getCreditNotesAction({ limit: 100 });
  const creditNotes = result.success && result.data ? result.data : [];

  return (
    <div>
      <NotasCreditoClient initialCreditNotes={creditNotes} />
    </div>
  );
}
