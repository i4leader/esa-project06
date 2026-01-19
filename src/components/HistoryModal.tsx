import React, { useEffect, useState } from 'react';
import { StorageManager } from '../utils/storage';
import { MeetingSession } from '../types';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoadSession: (session: MeetingSession) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
    isOpen,
    onClose,
    onLoadSession
}) => {
    const [sessions, setSessions] = useState<MeetingSession[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadHistory();
        }
    }, [isOpen]);

    const loadHistory = () => {
        setLoading(true);
        const sessionIds = StorageManager.getSessions();
        const loadedSessions: MeetingSession[] = [];

        sessionIds.forEach(id => {
            const session = StorageManager.getMeetingSession(id);
            if (session) {
                loadedSessions.push(session);
            }
        });

        // Sort by start time descending
        loadedSessions.sort((a, b) => b.startTime - a.startTime);
        setSessions(loadedSessions);
        setLoading(false);
    };

    const handleDelete = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this session?')) {
            StorageManager.removeSession(sessionId);
            // Also remove the actual data
            localStorage.removeItem(`meetingmind.session.${sessionId}`);
            loadHistory();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Meeting History
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            No meeting history found.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sessions.map(session => (
                                <div
                                    key={session.id}
                                    onClick={() => {
                                        onLoadSession(session);
                                        onClose();
                                    }}
                                    className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                                                {session.title || 'Untitled Meeting'}
                                            </h3>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                                                <p>📅 {new Date(session.startTime).toLocaleString()}</p>
                                                <p>⏱️ Duration: {formatDuration(session.metadata?.duration || 0)}</p>
                                                <p>📝 Words: {session.metadata?.wordCount || 0}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(e, session.id)}
                                            className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                            title="Delete Session"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}
