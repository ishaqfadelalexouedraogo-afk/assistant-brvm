export function Bandeau() {
  return (
    <div className="bandeau" aria-hidden="true">
      <span><b>BRVM</b>Bourse régionale · Abidjan</span>
      <span><b>UEMOA</b>8 pays · 1 marché</span>
      <span><b>XOF</b>FCFA · parité fixe avec l&apos;euro</span>
      <span><b>BCEAO</b>politique monétaire</span>
      <span><b>AMF-UMOA</b>régulateur du marché</span>
      <span><b>DC/BR</b>dépositaire central</span>
      <span><b>SYSCOHADA</b>référentiel comptable</span>
    </div>
  );
}

export function Avertissement() {
  return (
    <p className="avertissement" role="note">
      Outil pédagogique, pas un conseil en investissement. L&apos;IA peut se tromper et ne connaît pas les cours en direct :
      vérifie toujours sur brvm.org et auprès d&apos;une SGI agréée par l&apos;AMF-UMOA avant d&apos;investir.
    </p>
  );
}
