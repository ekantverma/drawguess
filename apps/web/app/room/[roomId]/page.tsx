'use client';
import { useParams } from 'next/navigation';
import { Lobby } from '@/components/lobby/Lobby';
import { RoomGate } from '@/components/RoomGate';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const code = String(roomId).toUpperCase();
  return (
    <RoomGate code={code} view="lobby">
      {(room, leave) => <Lobby room={room} onLeave={leave} />}
    </RoomGate>
  );
}
