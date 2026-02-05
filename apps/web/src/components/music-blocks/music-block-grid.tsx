import { Children, type PropsWithChildren } from "react";

type TProps = PropsWithChildren;

const MusicBlockGrid = ({ children }: TProps) => {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4">
      {children}
      {/* Add empty divs to keep all grid items the same size regardless of number of items */}
      {Children.count(children) < 10 && (
        <>
          <div />
          <div />
          <div />
          <div />
          <div />
          <div />
          <div />
          <div />
          <div />
          <div />
        </>
      )}
    </div>
  );
};

export default MusicBlockGrid;
