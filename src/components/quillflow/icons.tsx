"use client";

import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import React from 'react';

// Manually map common names to Lucide names if needed, or ensure exact names are used.
// For example, if user provides 'Math', map to 'CalculatorIcon'.
// For now, we assume `iconName` is a valid key in `LucideIcons`.

interface NotebookIconProps extends LucideProps {
  name: string;
}

const FallbackIcon = LucideIcons.HelpCircle; // Default icon if requested one is not found

const NotebookIcon: React.FC<NotebookIconProps> = ({ name, ...props }) => {
  const IconComponent = (LucideIcons as any)[name] || FallbackIcon;
  return <IconComponent {...props} />;
};

export default NotebookIcon;
