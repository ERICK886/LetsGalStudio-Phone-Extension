/**
 * @file PageTransition.tsx
 * @description 相册内页栈式过渡：前进右进左出、后退左进右出、同层淡入淡出。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

import React, { useEffect, useRef, useState } from "react";

/** 过渡方向。 */
export type PageTransitionDirection = "forward" | "back" | "crossfade";

export interface PageTransitionProps {
  /** 页面身份；变化时触发过渡 */
  pageKey: string;
  /** 过渡方向 */
  direction: PageTransitionDirection;
  /** 当前页内容 */
  children: React.ReactNode;
}

const TRANSITION_MS = 280;

interface Layer {
  key: string;
  node: React.ReactNode;
  /** enter | exit | steady */
  phase: "enter" | "exit" | "steady";
  direction: PageTransitionDirection;
}

/**
 * 双层页面过渡容器。
 *
 * @param props - PageTransitionProps
 * @returns 舞台节点
 *
 * @remarks
 * - 前进：新页自右滑入，旧页向左淡出
 * - 后退：新页自左滑入，旧页向右淡出
 * - crossfade：同层切换（如查看器换图）淡入淡出
 * - `prefers-reduced-motion` 时由 CSS 缩短动画
 *
 * @example
 * ```tsx
 * <PageTransition pageKey={nav.screen} direction={direction}>
 *   <HomeScreen ... />
 * </PageTransition>
 * ```
 */
export function PageTransition(props: PageTransitionProps): React.ReactElement {
  const { pageKey, direction, children } = props;

  const [layers, setLayers] = useState<Layer[]>([
    { key: pageKey, node: children, phase: "steady", direction },
  ]);
  const prevKeyRef = useRef(pageKey);
  const prevChildrenRef = useRef(children);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  // 同 key 时仅刷新当前层内容（catalog 刷新等）
  useEffect(() => {
    if (prevKeyRef.current === pageKey) {
      prevChildrenRef.current = children;
      setLayers((current) => {
        if (current.length === 0) return current;
        const next = [...current];
        const last = next[next.length - 1];
        if (last.key === pageKey && last.phase !== "exit") {
          next[next.length - 1] = { ...last, node: children };
        }
        return next;
      });
    }
  }, [children, pageKey]);

  // key 变化：叠加入场层 + 旧层退场
  useEffect(() => {
    if (prevKeyRef.current === pageKey) return;

    const outgoingKey = prevKeyRef.current;
    const outgoingNode = prevChildrenRef.current;
    prevKeyRef.current = pageKey;
    prevChildrenRef.current = children;

    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }

    setLayers([
      {
        key: outgoingKey,
        node: outgoingNode,
        phase: "exit",
        direction,
      },
      {
        key: pageKey,
        node: children,
        phase: "enter",
        direction,
      },
    ]);

    timerRef.current = setTimeout(() => {
      setLayers([
        {
          key: pageKey,
          node: children,
          phase: "steady",
          direction,
        },
      ]);
      timerRef.current = undefined;
    }, TRANSITION_MS);

    return () => {
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [pageKey, direction, children]);

  return (
    <div className="pa-stage" data-pa-transition={direction}>
      {layers.map((layer) => (
        <div
          key={layer.key}
          className={[
            "pa-page",
            layer.phase === "enter"
              ? `pa-page-enter-${layer.direction}`
              : "",
            layer.phase === "exit" ? `pa-page-exit-${layer.direction}` : "",
            layer.phase === "steady" ? "pa-page-steady" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {layer.node}
        </div>
      ))}
    </div>
  );
}
