import React from 'react';
import { Badge, Dot } from './ui';
import { platformMeta } from '../lib/utils';

export default function PlatformBadge({ platform }) {
  const meta = platformMeta(platform);
  return (
    <Badge color={meta.color}>
      <Dot color={meta.color} />
      {meta.label}
    </Badge>
  );
}
