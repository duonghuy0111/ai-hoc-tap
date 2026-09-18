import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';

interface Material { id: string; title: string; status: string }
interface Quiz {
    id: string;
    title: string;
    createdAt: string;
    questionType: 'mcq' | 'essay';
    _count: { questions: number }
}

export default function QuizListPage() {
    const { id: subjectId } = useParams<{ id: string }>();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [selectedMaterialId, setSelectedMaterialId] = useState('');
    const [questionType, setQuestionType] = useState<'mcq' | 'essay'>('mcq');
    const [numberOfQuestions, setNumberOfQuestions] = useState<number>(5);

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    async function loadData() {
        if (!subjectId) return;
        try {
            setLoading(true);
            const [quizRes, matRes] = await Promise.all([
                client.get(`/subjects/${subjectId}/quizzes`),
                client.get(`/subjects/${subjectId}/materials`),
            ]);
            setQuizzes(quizRes.data);
            setMaterials(
                matRes.data.filter((m: Material) => m.status === 'ready' || m.status === 'ready_embedding_failed')
            );
        } catch (err) {
            console.error('Lỗi tải dữ liệu quiz:', err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [subjectId]);

    async function handleGenerate() {
        if (!selectedMaterialId || !subjectId) return;
        setGenerating(true);
        try {
            await client.post(`/subjects/${subjectId}/quizzes/generate`, {
                materialId: selectedMaterialId,
                numberOfQuestions,
                questionType,
            });
            setSelectedMaterialId(''); 
            await loadData();
        } catch (err: any) {
            const message = err.response?.status === 429
                ? 'Bạn tạo quiz hơi nhanh, vui lòng đợi 1 phút rồi thử lại.'
                : err.response?.data?.message ?? 'Có lỗi xảy ra khi tạo quiz.';
            alert(message);
        } finally {
            setGenerating(false);
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold text-slate-800">Bài kiểm tra & Ôn tập</h1>

            {/* Form tạo Quiz */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex gap-3 items-center flex-wrap">
                <select
                    value={selectedMaterialId}
                    onChange={(e) => setSelectedMaterialId(e.target.value)}
                    className="flex-1 min-w-[220px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">-- Chọn tài liệu để tạo quiz --</option>
                    {materials.map((m) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                </select>

                <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as 'mcq' | 'essay')}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="mcq">Trắc nghiệm (MCQ)</option>
                    <option value="essay">Tự luận ngắn</option>
                </select>

                <select
                    value={numberOfQuestions}
                    onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value={5}>5 câu</option>
                    <option value={10}>10 câu</option>
                    <option value={15}>15 câu</option>
                </select>

                <button
                    onClick={handleGenerate}
                    disabled={!selectedMaterialId || generating}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors disabled:opacity-40"
                >
                    {generating ? 'Đang tạo bằng AI...' : 'Tạo Quiz'}
                </button>
            </div>

            {/* Danh sách Quiz */}
            {loading ? (
                <p className="text-slate-400 text-sm text-center py-8">Đang tải danh sách bài kiểm tra...</p>
            ) : quizzes.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">Chưa có quiz nào, hãy chọn tài liệu phía trên để tạo quiz đầu tiên.</p>
            ) : (
                <div className="grid gap-3">
                    {quizzes.map((q) => (
                        <Link
                            key={q.id}
                            to={`/subjects/${subjectId}/quizzes/${q.id}`}
                            className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex justify-between items-center group"
                        >
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">
                                        {q.title}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.questionType === 'essay'
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                                        }`}>
                                        {q.questionType === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Tạo ngày: {new Date(q.createdAt).toLocaleDateString('vi-VN')}
                                </p>
                            </div>
                            <span className="text-sm font-medium text-slate-500 bg-slate-50 px-3 py-1 rounded-lg">
                                {q._count?.questions ?? 0} câu hỏi
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}