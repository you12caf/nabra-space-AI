import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateGeneration, useGetGeneration, getGetGenerationQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Trash2, Plus, Play, Mic2, AlertCircle, RefreshCw, Loader2, Volume2, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
const MAX_CHARACTERS_PER_GENERATION = 500;


const TONES = [
  { value: 'Calm', label: 'هادئ' },
  { value: 'Serious', label: 'جاد' },
  { value: 'Friendly', label: 'ودود' },
  { value: 'Excited', label: 'متحمس' },
  { value: 'Energetic', label: 'حيوي' },
  { value: 'Curious', label: 'فضولي' },
  { value: 'Satisfied', label: 'راضٍ' },
  { value: 'Relieved', label: 'مرتاح' },
];

const CUSTOM_TONE_SENTINEL = '__custom__';

interface Block {
  id: string;
  tone: string;
  isCustomTone: boolean;
  text: string;
}

export default function Generate() {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [blocks, setBlocks] = useState<Block[]>([
    { id: crypto.randomUUID(), tone: 'Calm', isCustomTone: false, text: '' }
  ]);
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(null);

  const createGen = useCreateGeneration();
  
  // Polling generation status
  const { data: generation, isLoading: isPolling } = useGetGeneration(activeGenerationId!, {
    query: {
      enabled: !!activeGenerationId,
      queryKey: getGetGenerationQueryKey(activeGenerationId!),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === 'pending' || status === 'processing' ? 2000 : false;
      }
    }
  });

  useEffect(() => {
    if (generation?.status === 'completed') {
      toast.success('تم توليد الصوت بنجاح!');
      refreshProfile(); // refresh credits
    } else if (generation?.status === 'failed') {
      toast.error('حدث خطأ أثناء التوليد. يرجى المحاولة مرة أخرى.');
      setActiveGenerationId(null);
    }
  }, [generation?.status]);

  const addBlock = () => {
    setBlocks([...blocks, { id: crypto.randomUUID(), tone: 'Calm', isCustomTone: false, text: '' }]);
  };

  const removeBlock = (id: string) => {
    if (blocks.length > 1) {
      setBlocks(blocks.filter(b => b.id !== id));
    }
  };

  const updateBlock = (id: string, field: keyof Block, value: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const totalChars = blocks.reduce((sum, b) => sum + b.text.length, 0);
  const isOverLimit = totalChars > MAX_CHARACTERS_PER_GENERATION;
  const isNearLimit = totalChars > MAX_CHARACTERS_PER_GENERATION * 0.85;
  const hasEmptyText = blocks.some(b => b.text.trim().length === 0);
  const hasEmptyCustomTone = blocks.some(b => b.isCustomTone && !b.tone.trim());
  const isGenerating = createGen.isPending || (generation?.status === 'pending' || generation?.status === 'processing');
  const hasEnoughCredits = (profile?.credits_balance || 0) >= totalChars;

  const handleGenerate = () => {
    if (totalChars === 0) {
      toast.error('الرجاء إدخال النص أولاً');
      return;
    }
    if (!hasEnoughCredits) {
      toast.error('رصيدك غير كافٍ للقيام بهذه العملية');
      return;
    }

    createGen.mutate({
      data: {
        blocks: blocks.map(({ tone, text }) => ({ tone, text }))
      }
    }, {
      onSuccess: (data) => {
        setActiveGenerationId(data.id);
      },
      onError: (err: any) => {
        toast.error(err?.data?.error || 'حدث خطأ غير متوقع');
      }
    });
  };

  const resetStudio = () => {
    setBlocks([{ id: crypto.randomUUID(), tone: 'Calm', isCustomTone: false, text: '' }]);
    setActiveGenerationId(null);
  };

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">الاستوديو الذكي</h1>
        <p className="text-muted-foreground">أضف النصوص، حدد النبرة المناسبة لكل مقطع، وسنجمعها لك في مقطع صوتي واحد متكامل.</p>
      </div>

      <div className="space-y-6">
        {blocks.map((block, index) => (
          <div key={block.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row gap-4 mb-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="bg-primary/10 text-primary font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1 sm:w-[200px]">
                  <select 
                    value={block.isCustomTone ? CUSTOM_TONE_SENTINEL : block.tone}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === CUSTOM_TONE_SENTINEL) {
                        setBlocks(blocks.map(b => b.id === block.id ? { ...b, isCustomTone: true, tone: '' } : b));
                      } else {
                        setBlocks(blocks.map(b => b.id === block.id ? { ...b, isCustomTone: false, tone: val } : b));
                      }
                    }}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                    disabled={isGenerating || generation?.status === 'completed'}
                  >
                    {TONES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                    <option value={CUSTOM_TONE_SENTINEL}>🎭 تخصيص</option>
                  </select>
                  {block.isCustomTone && (
                    <input
                      type="text"
                      value={block.tone}
                      onChange={(e) => updateBlock(block.id, 'tone', e.target.value)}
                      placeholder="اكتب النبرة اللي تحبها، مثلاً: يتكلم بسخرية خفيفة"
                      maxLength={60}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary outline-none mt-2"
                      disabled={isGenerating || generation?.status === 'completed'}
                      data-testid={`input-custom-tone-${index}`}
                    />
                  )}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeBlock(block.id)}
                disabled={blocks.length === 1 || isGenerating || generation?.status === 'completed'}
                data-testid={`button-delete-block-${index}`}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="relative">
              <Textarea
                value={block.text}
                onChange={(e) => updateBlock(block.id, 'text', e.target.value)}
                placeholder="اكتب النص هنا..."
                className="min-h-[120px] resize-none text-base bg-background/50 border-input rounded-xl p-4"
                dir="rtl"
                disabled={isGenerating || generation?.status === 'completed'}
                data-testid={`textarea-block-${index}`}
              />
              <div className="absolute bottom-3 left-3 text-xs font-medium px-2 py-1 rounded-md bg-muted text-muted-foreground">
                {block.text.length} حرف
              </div>
            </div>
          </div>
        ))}

        {(!generation || generation.status === 'failed') && (
          <Button 
            variant="outline" 
            className="w-full py-6 border-dashed border-2 rounded-2xl text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 gap-2"
            onClick={addBlock}
            disabled={isGenerating}
            data-testid="button-add-block"
          >
            <Plus className="w-5 h-5" />
            إضافة مقطع جديد
          </Button>
        )}
      </div>

      {/* Results Area */}
      {generation?.status === 'completed' && generation.audio_url && (
        <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-2xl flex flex-col items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
            <Volume2 className="w-8 h-8 text-primary" />
          </div>
          <div className="w-full max-w-md">
            <audio controls src={generation.audio_url} className="w-full" data-testid="audio-player" />
          </div>
          <Button onClick={resetStudio} variant="outline" className="gap-2" data-testid="button-new-generation">
            <RefreshCw className="w-4 h-4" />
            إنشاء مقطع جديد
          </Button>
        </div>
      )}

      {/* Fixed Bottom Bar */}
      {(!generation || generation.status === 'failed' || isGenerating) && (
        <div className="fixed bottom-0 right-0 left-0 lg:left-0 lg:right-0 lg:pl-0 lg:mr-[280px] bg-card border-t border-border p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-40">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">مجموع الأحرف</span>
                  <span className={`text-2xl font-bold flex items-center gap-2 ${isOverLimit ? 'text-destructive' : isNearLimit ? 'text-amber-600' : ''}`}> {totalChars} / {MAX_CHARACTERS_PER_GENERATION} حرف </span>
              </div>
              
              <div className="h-10 w-px bg-border hidden sm:block" />
              
              {!hasEnoughCredits && totalChars > 0 && (
                <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <div className="flex flex-col text-sm">
                    <span>رصيد غير كافٍ</span>
                    <Link href="/pricing" className="font-bold underline hover:text-destructive/80">
                      اشحن رصيدك
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Button
              size="lg"
              className="w-full sm:w-auto px-10 rounded-xl gap-2 font-bold text-lg"
              disabled={totalChars === 0 || hasEmptyText || hasEmptyCustomTone || !hasEnoughCredits || isGenerating || isOverLimit}
              onClick={handleGenerate}
              data-testid="button-generate"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري التوليد...
                </>
              ) : (
                <>
                  <Mic2 className="w-5 h-5" />
                  توليد الصوت
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
