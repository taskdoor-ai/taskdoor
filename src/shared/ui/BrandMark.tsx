import logoUrl from "@/assets/brand/taskdoor-logo.svg";
import logoInverseUrl from "@/assets/brand/taskdoor-logo-inverse.svg";
import markInverseUrl from "@/assets/brand/taskdoor-mark-inverse.svg";

/** The TaskDoor mark alone, in white, for brand-green surfaces where only a mark fits. */
export function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><img alt="" src={markInverseUrl} /></span>;
}

/** The horizontal Taskdoor logo: standard colors on light, inverse on dark. The caller names it. */
export function BrandLogo() {
  return <>
    <img alt="" aria-hidden="true" className="brand-logo brand-logo-light" src={logoUrl} />
    <img alt="" aria-hidden="true" className="brand-logo brand-logo-dark" src={logoInverseUrl} />
  </>;
}
