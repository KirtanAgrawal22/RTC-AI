"use client";

import { Component, ReactNode } from "react";
import dynamic from "next/dynamic";

const CustomWhiteboard = dynamic(
  () => import("@/components/CustomWhiteboard").then((mod) => mod.CustomWhiteboard),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-white border border-gray-300 rounded-lg text-gray-500">
        Loading whiteboard…
      </div>
    ),
  }
);

interface Props {
  className?: string;
}

interface State {
  hasError: boolean;
}

export class WhiteboardWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Whiteboard error:", error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-white border border-gray-300 rounded-lg p-6 text-center">
          <p className="text-gray-700 font-medium">Whiteboard couldn’t load</p>
          <p className="text-sm text-gray-500 mt-2">
            Try refreshing the page or use the Code Editor tab.
          </p>
        </div>
      );
    }
    return <CustomWhiteboard />;
  }
}
