"use client";

type User = {
  id?: string;
  username: string;
};

export default function UserList({
  users = [],
}: {
  users?: User[];
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-300">
          Online Users
        </span>
        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
          {users.length}
        </span>
      </div>

      <div className="space-y-1">
        {users.map((user, index) => (
          <div
            key={index}
            className="text-sm text-gray-200 flex items-center gap-2"
          >
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            {user.username}
          </div>
        ))}
      </div>
    </div>
  );
}
