import { OrganizationWorkspace } from "@/features/organizations/OrganizationWorkspace";

export default function OrganizationsPage() {
  return (
    <main className="section">
      <p className="eyebrow">ESPACIO ADMINISTRATIVO</p>
      <h1>Gestiona tu complejo</h1>
      <p className="pageLead">
        Esta área es para propietarios y colaboradores. Crea una organización o
        ingresa a un espacio de trabajo existente.
      </p>
      <OrganizationWorkspace />
    </main>
  );
}
