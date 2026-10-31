import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { UnavailableMembersList } from '@/components/admin/UnavailableMembersList';
import { useAdminMinistry } from '@/hooks/useAdminMinistry';

export default function AdminAvailability() {
  const { ministry } = useAdminMinistry();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Indisponibilidades"
        description="Membros que marcaram datas em que não podem ser escalados."
      />

      <UnavailableMembersList
        ministry={ministry}
        title="Próximas indisponibilidades"
        description="Lista atualizada com base no que cada membro marcou no perfil."
      />
    </div>
  );
}
