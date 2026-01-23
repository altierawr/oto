import { useEffect, useState, type RefObject } from "react";
import useLatest from "../utils/useLatest";

type TProps = {
  ref: RefObject<HTMLElement | null>;
  initialValue: number | null;
  onMouseUp?: (value: number) => void;
};

const useBarDrag = ({ ref, initialValue, onMouseUp }: TProps) => {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [value, setValue] = useState(initialValue);

  const latestIsMouseDown = useLatest(isMouseDown);

  const getValue = (e: { clientX: number }, skipMouseDownCheck?: boolean) => {
    if (ref.current && (skipMouseDownCheck || latestIsMouseDown.current)) {
      const rect = ref.current.getBoundingClientRect();

      const percent = (e.clientX - rect.left) / rect.width;

      return Math.max(0, Math.min(percent, 1));
    }

    return null;
  };

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const handleMouseUp = (e: MouseEvent) => {
      const currentValue = getValue(e);
      if (currentValue !== null) {
        onMouseUp?.(currentValue);
      }

      setIsMouseDown(false);
    };

    const handleMouseMove = (
      e: { clientX: number },
      skipMouseDownCheck?: boolean,
    ) => {
      const currentValue = getValue(e, skipMouseDownCheck);

      if (currentValue !== null) {
        setValue(currentValue);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      handleMouseMove(e, true);
      setIsMouseDown(true);
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleMouseMove);
    ref.current.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
      ref.current?.removeEventListener("mousedown", handleMouseDown);
    };
  }, [ref.current]);

  return {
    value,
    isDragging: latestIsMouseDown.current,
  };
};

export default useBarDrag;
