import { notFound } from "next/navigation";
import { getPetProfileData } from "@/lib/actions/pets";
import { PetProfileActions } from "@/components/PetProfileActions";
import { PetProfileContent } from "@/components/PetProfileContent";
import { ProfileModal } from "@/components/ProfileModal";

// ============================================================================
// INTERCEPTED ROUTE — (.) matches /mascota/[id] navigated from any sibling
// route at the app root via client-side navigation. Direct visits or a
// hard refresh skip this and render app/mascota/[id]/page.tsx (Paso 6)
// instead — same data, same PetProfileContent, just without the floating
// chrome.
// ============================================================================

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MascotaProfileModal({ params }: PageProps) {
  const { id } = await params;
  const data = await getPetProfileData(id);

  if (!data) {
    notFound();
  }

  const { pet, allPersons, allPets, petRelationships } = data;

  return (
    <ProfileModal
      accent="cyan"
      actions={<PetProfileActions pet={pet} allPersons={allPersons} allPets={allPets} />}
    >
      <PetProfileContent pet={pet} petRelationships={petRelationships} />
    </ProfileModal>
  );
}
