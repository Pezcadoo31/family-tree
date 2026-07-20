import { notFound } from "next/navigation";
import { getPersonProfileData } from "@/lib/actions/persons";
import { PersonProfileActions } from "@/components/PersonProfileActions";
import { PersonProfileContent } from "@/components/PersonProfileContent";
import { ProfileModal } from "@/components/ProfileModal";

// ============================================================================
// INTERCEPTED ROUTE — (.) matches /persona/[id] navigated from any sibling
// route at the app root (árbol, home, otro perfil, etc.) via client-side
// navigation. Direct visits or a hard refresh on /persona/[id] skip this
// entirely and render app/persona/[id]/page.tsx (Paso 5) instead — same
// data, same PersonProfileContent, just without the floating chrome.
// ============================================================================

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PersonaProfileModal({ params }: PageProps) {
  const { id } = await params;
  const data = await getPersonProfileData(id);

  if (!data) {
    notFound();
  }

  const { person, allPersons, allPets, relationships, petRelationships } = data;

  return (
    <ProfileModal
      accent="violet"
      actions={<PersonProfileActions person={person} allPersons={allPersons} allPets={allPets} />}
    >
      <PersonProfileContent
        person={person}
        relationships={relationships}
        petRelationships={petRelationships}
      />
    </ProfileModal>
  );
}
