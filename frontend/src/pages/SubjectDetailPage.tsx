import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import { subscribeToPush } from '../utils/push';

interface Material {
    id: string;
    title: string;
    status: string;
    fileType: string;
    createdAt: string
}

const STATUS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
    processing: { text: 'Đang xử lý...', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    ready: { text: 'Sẵn sàng', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    ready_embedding_failed: { text: 'Lỗi embedding', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
    failed: { text: 'Thất bại', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
};

export default function SubjectDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [uploading, setUploading] = useState(false);
    const [selectedFileIsVideo, setSelectedFileIsVideo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [summaries, setSummaries] = useState<Record<string, string>>({});
    const [loadingSummary, setLoadingSummary] = useState<string | null>(null);
    const [expandedSummaries, setExpandedSummaries] = useState<Record<string, boolean>>({});

    const loadMaterials = useCallback(async () => {
        if (!id) return;
        try {
            const { data } = await client.get(`/subjects/${id}/materials`);
            setMaterials(data);
        } catch (err) {
            console.error('Lỗi tải danh sách tài liệu:', err);
        }
    }, [id]);

    useEffect(() => {
        loadMaterials();
    }, [loadMaterials]);

    useEffect(() => {
        const hasProcessing = materials.some((m) => m.status === 'processing');
        if (!hasProcessing) return;
        const interval = setInterval(loadMaterials, 5000);
        return () => clearInterval(interval);
    }, [materials, loadMaterials]);

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        setSelectedFileIsVideo(file.type.startsWith('video/'));
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await client.post(`/subjects/${id}/materials`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            await loadMaterials();
        } catch (err: any) {
            alert(err.response?.data?.message ?? 'Upload thất bại');
        } finally {
            setUploading(false);
            setSelectedFileIsVideo(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    async function handleToggleSummary(materialId: string) {
        if (summaries[materialId]) {
            setExpandedSummaries((prev) => ({ ...prev, [materialId]: !prev[materialId] }));
            return;
        }

        setLoadingSummary(materialId);
        try {
            const { data } = await client.get(`/materials/${materialId}/summary`);
            setSummaries((prev) => ({ ...prev, [materialId]: data.content }));
            setExpandedSummaries((prev) => ({ ...prev, [materialId]: true }));
        } catch (err: any) {
            alert(err.response?.data?.message ?? 'Không thể tạo tóm tắt');
        } finally {
            setLoadingSummary(null);
        }
    }
    async function handleSubscribeToPush() {
        const success = await subscribeToPush();

        if (success) {
            alert('Đã đăng ký nhận thông báo thành công!');
        }
    }

    async function handleReprocess(materialId: string) {
        try {
            await client.post(`/materials/${materialId}/reprocess`);
            await loadMaterials();
        } catch (err: any) {
            alert(err.response?.data?.message ?? 'Không thể xử lý lại');
        }
    }


    const getFileIcon = (fileType: string) => {
        if (fileType === 'video') return '🎬';
        if (fileType === 'image') return '🖼️';
        return '📄';
    };

    return (
        <div className="space-y-6">
            {/* Thanh Tiêu đề & Hành động */}
            <div className="flex justify-between items-center flex-wrap gap-3">
                <h1 className="text-xl font-semibold text-slate-800">Tài liệu môn học</h1>
                <div className="flex gap-2 items-center flex-wrap">
                    <button
                        onClick={handleSubscribeToPush}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                        title="Bật thông báo nhắc nhở học tập"
                    >
                        🔔 Bật thông báo
                    </button>
                    <Link
                        to={`/subjects/${id}/chat`}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    >
                        Hỏi đáp AI →
                    </Link>
                    <Link
                        to={`/subjects/${id}/quizzes`}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    >
                        Bài kiểm tra →
                    </Link>
                </div>
            </div>

            {/* Khối Upload File */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2">
                <label className="block text-sm font-medium text-slate-700">Tải lên tài liệu mới (PDF, Ảnh, Video)</label>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.mp4,.mov"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer disabled:opacity-50"
                />
                {uploading && <p className="text-xs font-medium text-amber-600">Đang tải lên và gửi xử lý...</p>}
                {selectedFileIsVideo && (
                    <p className="text-xs text-amber-600">
                        ⏳ File Video có thể mất vài phút để bóc tách âm thanh và trích xuất nội dung văn bản.
                    </p>
                )}
            </div>

            {/* Danh sách tài liệu */}
            <div className="space-y-3">
                {materials.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-8">Chưa có tài liệu nào được tải lên.</p>
                ) : (
                    materials.map((m) => {
                        const statusConfig = STATUS_LABEL[m.status] ?? {
                            text: m.status,
                            color: 'text-slate-600',
                            bg: 'bg-slate-50 border-slate-200',
                        };
                        const isExpanded = expandedSummaries[m.id];

                        return (
                            <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                                <div className="flex justify-between items-center flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{getFileIcon(m.fileType)}</span>
                                        <span className="text-sm font-medium text-slate-800">{m.title}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.color} font-medium`}>
                                            {statusConfig.text}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {m.status === 'ready_embedding_failed' && (
                                            <button
                                                onClick={() => handleReprocess(m.id)}
                                                className="text-xs font-medium text-indigo-600 hover:underline"
                                            >
                                                Thử xử lý lại
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleToggleSummary(m.id)}
                                            disabled={loadingSummary === m.id}
                                            className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-40"
                                        >
                                            {loadingSummary === m.id
                                                ? 'Đang tạo...'
                                                : summaries[m.id]
                                                    ? isExpanded ? 'Ẩn tóm tắt' : 'Hiện tóm tắt'
                                                    : 'Tóm tắt AI'}
                                        </button>
                                    </div>
                                </div>

                                {/* Khối Tóm tắt AI */}
                                {summaries[m.id] && isExpanded && (
                                    <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        <p className="font-semibold text-slate-800 mb-1">💡 Tóm tắt nội dung chính:</p>
                                        {summaries[m.id]}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}