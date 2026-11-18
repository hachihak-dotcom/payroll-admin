import { ChevronRight, House } from "lucide-react";
import Link from "next/link";

export function PageHeading({ title, description, parent, action }: {
  title: string; description: string; parent?: string; action?: React.ReactNode;
}) {
  return <div className="page-heading">
    <div>
      <nav className="breadcrumb" aria-label="현재 위치">
        <Link href="/" aria-label="홈"><House size={14} /></Link><ChevronRight size={13} />
        {parent && <><span>{parent}</span><ChevronRight size={13} /></>}
        <span aria-current="page">{title}</span>
      </nav>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {action}
  </div>;
}
