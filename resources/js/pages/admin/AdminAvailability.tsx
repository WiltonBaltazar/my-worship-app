import { UnavailableMembersList } from '@/components/admin/UnavailableMembersList';

export default function AdminAvailability() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Indisponibilidades</h1>
        <p className="admin-page-description">
          Membros que marcaram datas em que não podem ser escalados.
        </p>
      </div>

      <UnavailableMembersList
        title="Próximas indisponibilidades"
        description="Lista atualizada com base no que cada membro marcou no perfil."
      />
    </div>
  );
}
