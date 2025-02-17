import React, { useState } from 'react';
import { KeyRound, Users } from 'lucide-react';

interface RoomAccessProps {
  onJoin: (nickname: string, roomKey: string) => void;
}

export const RoomAccess: React.FC<RoomAccessProps> = ({ onJoin }) => {
  const [nickname, setNickname] = useState('');
  const [roomKey, setRoomKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname && roomKey) {
      onJoin(nickname, roomKey);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Join Collaborative Board
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Users size={18} />
                <span>Nickname</span>
              </div>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your nickname"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <KeyRound size={18} />
                <span>Room Key</span>
              </div>
            </label>
            <input
              type="text"
              value={roomKey}
              onChange={(e) => setRoomKey(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter room key"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors duration-200"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
};