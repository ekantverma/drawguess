'use client';
import { useParams } from 'next/navigation';
import { GameBoard } from '@/components/game/GameBoard';
import { RoomGate } from '@/components/RoomGate';

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const code = String(roomId).toUpperCase();
  return (
    <RoomGate code={code} view="game">
      {(_room, leave) => <GameBoard onLeave={leave} />}
    </RoomGate>
  );
}
