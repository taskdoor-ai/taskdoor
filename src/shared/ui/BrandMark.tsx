import logoUrl from "@/assets/brand/taskdoor-logo.svg";
import logoInverseUrl from "@/assets/brand/taskdoor-logo-inverse.svg";
import markInverseUrl from "@/assets/brand/taskdoor-mark-inverse.svg";

/** The TaskDoor mark alone, in white, for brand-green surfaces where only a mark fits. */
export function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><img alt="" src={markInverseUrl} /></span>;
}

/** The horizontal lockup: the standard colors on light, the reversed artwork on dark. The caller names it. */
export function BrandLogo() {
  return <span aria-hidden="true" className="brand-lockup">
    <img alt="" className="brand-lockup-light" src={logoUrl} />
    <img alt="" className="brand-lockup-dark" src={logoInverseUrl} />
  </span>;
}
