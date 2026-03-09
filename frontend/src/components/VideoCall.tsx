'use client';

import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { useSocket } from '@/contexts/SocketContext';
import dynamic from "next/dynamic";
const Rnd = dynamic(() => import("react-rnd").then(mod => mod.Rnd), { ssr: false });

interface Props {
  roomId: string;
}

const VideoCall: React.FC<Props> = ({ roomId }) => {
  const { socket } = useSocket();

  const [isOpen, setIsOpen] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement>>({});
  const peersRef = useRef<Record<string, Peer.Instance>>({});

  useEffect(() => {
    if (!socket || !roomId || !isOpen) return;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        socket.emit('join-video-room', roomId);

        console.log('[VIDEO] joined room', roomId);
      } catch (err) {
        console.error('Camera error', err);
      }
    };

    start();

    const onUserJoined = (userId: string) => {
      if (peersRef.current[userId]) return;

      const peer = new Peer({
        initiator: true,
        trickle: true,
        stream: localStreamRef.current || undefined
      });

      peersRef.current[userId] = peer;

      peer.on('signal', signal => {
        socket.emit('send-signal', { signal, to: userId, roomId });
      });

      peer.on('stream', remoteStream => {
        console.log("remote stream from", userId);

        setRemoteStreams(prev => ({
          ...prev,
          [userId]: remoteStream
        }));
      });
    };

    const onReceiveSignal = ({ signal, from }: any) => {
      let peer = peersRef.current[from];

      if (!peer) {
        peer = new Peer({
          initiator: false,
          trickle: true,
          stream: localStreamRef.current || undefined
        });

        peersRef.current[from] = peer;

        peer.on('signal', signalData => {
          socket.emit('return-signal', { signal: signalData, to: from });
        });

        peer.on('stream', remoteStream => {
          setRemoteStreams(prev => ({
            ...prev,
            [from]: remoteStream
          }));
        });
      }

      peer.signal(signal);
    };

    const onReturnSignal = ({ signal, from }: any) => {
      const peer = peersRef.current[from];
      if (peer) peer.signal(signal);
    };

    socket.on('user-joined-video', onUserJoined);
    socket.on('receive-signal', onReceiveSignal);
    socket.on('receive-return-signal', onReturnSignal);

    return () => {
      socket.off('user-joined-video', onUserJoined);
      socket.off('receive-signal', onReceiveSignal);
      socket.off('receive-return-signal', onReturnSignal);

      Object.values(peersRef.current).forEach(p => p.destroy());

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      peersRef.current = {};
      setRemoteStreams({});
    };
  }, [socket, roomId, isOpen]);

  useEffect(() => {
    Object.entries(remoteStreams).forEach(([id, stream]) => {
      const video = remoteVideoRefs.current[id];

      if (video && video.srcObject !== stream) {
        video.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  const endCall = () => {
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 flex items-center justify-center bg-green-600 text-white rounded-full shadow-lg hover:scale-110 transition"
      >
        📹
      </button>
    );
  }

  return (
    <Rnd
  default={{
    x: window.innerWidth - 420,
    y: window.innerHeight - 380,
    width: 380,
    height: 340
  }}
  minWidth={300}
  minHeight={240}
  bounds="window"
  dragHandleClassName="video-drag-handle"
  className="z-40"
>
  <div className="w-full h-full bg-zinc-950/95 backdrop-blur-md rounded-2xl flex flex-col overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.6)] border border-zinc-800">
      <div className="video-drag-handle bg-zinc-900/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between text-white cursor-move border-b border-zinc-800">
        <div className="font-semibold tracking-wide">Live Call</div>
        <button onClick={endCall} className="text-red-500">End</button>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 flex-1 bg-zinc-950">

        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover rounded-xl border border-zinc-800"
        />

        {Object.keys(remoteStreams).map(id => (
          <video
            key={id}
            ref={el => {
              if (el) remoteVideoRefs.current[id] = el;
            }}
            autoPlay
            playsInline
            className="w-full h-full object-cover rounded-xl"
          />
          
        ))}
        

      </div>

   </div>
</Rnd>
  );
};

export default VideoCall;