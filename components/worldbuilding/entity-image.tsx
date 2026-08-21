"use client";

import { useState } from "react";
import Image from "next/image";

import type { EntityCategory } from "@/types/entity";
import { EntityIconTile } from "@/components/worldbuilding/entity-icon-tile";

type EntityImageProps = {
  readonly src: string;
  readonly alt: string;
  readonly category: EntityCategory;
  readonly className: string;
  readonly iconClassName: string;
  readonly width: number;
  readonly height: number;
};

export function EntityImage({
  src,
  alt,
  category,
  className,
  iconClassName,
  width,
  height,
}: EntityImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasError = failedSrc === src;

  if (hasError) {
    return (
      <EntityIconTile
        category={category}
        className={className}
        iconClassName={iconClassName}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized
      onError={() => setFailedSrc(src)}
    />
  );
}
