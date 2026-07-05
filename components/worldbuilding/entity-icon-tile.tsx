import type { EntityCategory } from "@/types/entity";
import { getEntityCategoryStyle } from "@/lib/entity-category-style";
import { cn } from "@/lib/utils";

type EntityIconTileProps = {
  readonly category: EntityCategory;
  readonly className?: string;
  readonly iconClassName?: string;
};

export function EntityIconTile({
  category,
  className,
  iconClassName,
}: EntityIconTileProps) {
  const style = getEntityCategoryStyle(category);
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10",
        className,
      )}
      style={{
        color: style.color,
      }}
    >
      <Icon className={cn("h-5 w-5", iconClassName)} aria-hidden="true" />
    </div>
  );
}
