/**
 * @module shared/ui/portal
 * @description React Portal компонент для рендеринга вне DOM дерева
 */

"use client";

import { useEffect, useState } from "react";

import { createPortal } from "react-dom";

import { usePortal } from "@shared/lib/hooks";

interface PortalProps {
  children: React.ReactNode;
  id?: string;
}

/**
 * Portal компонент для рендеринга содержимого вне основного DOM дерева
 * Используется для модальных окон, tooltips и других overlay элементов
 */
export function Portal({
  children,
  id = "portal-root",
}: PortalProps): React.ReactNode {
  const portalElement = usePortal(id);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line no-restricted-syntax -- Инфраструктурный компонент, useEffect необходим для клиентского монтирования
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !portalElement) {
    return null;
  }

  return createPortal(children, portalElement);
}
