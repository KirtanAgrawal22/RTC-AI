import './globals.css';
import { SocketProvider } from "@/contexts/SocketContext";

export const metadata = {
  title: 'Code Editor',
  description: 'Online code editor with execution',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
