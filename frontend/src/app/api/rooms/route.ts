import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage (will reset on serverless function cold start)
const rooms = new Map();

export async function POST(request: NextRequest) {
  try {
    const { action, roomId, code, language, username, whiteboard, flowchart } = await request.json();
    
    if (action === 'create') {
      const user = { id: Math.random().toString(36), username };
      rooms.set(roomId, { 
        users: [user], 
        code: code || '', 
        language: language || 'python',
        whiteboard: whiteboard || { lines: [], textBoxes: [], shapes: [] },
        flowchart: flowchart || { elements: [], mermaidCode: '' }
      });
      return NextResponse.json({ 
        success: true, 
        roomId, 
        users: [user] 
      });
    }
    
    if (action === 'join') {
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        const user = { id: Math.random().toString(36), username };
        
        // Check if user already exists
        const existingUserIndex = room.users.findIndex((u: any) => u.username === username);
        if (existingUserIndex === -1) {
          room.users.push(user);
        } else {
          room.users[existingUserIndex] = user;
        }
        
        return NextResponse.json({ 
          success: true,
          roomId, 
          users: room.users, 
          code: room.code, 
          language: room.language,
          whiteboard: room.whiteboard,
          flowchart: room.flowchart
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Room not found' 
        }, { status: 404 });
      }
    }
    
    if (action === 'update') {
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        if (code !== undefined) room.code = code;
        if (language !== undefined) room.language = language;
        if (whiteboard !== undefined) room.whiteboard = whiteboard;
        if (flowchart !== undefined) room.flowchart = flowchart;
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Room not found' 
        }, { status: 404 });
      }
    }
    
    if (action === 'get') {
      if (rooms.has(roomId)) {
        return NextResponse.json({ 
          success: true, 
          data: rooms.get(roomId) 
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Room not found' 
        }, { status: 404 });
      }
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action' 
    }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Operation failed',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
