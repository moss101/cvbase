import React, { useState } from 'react';
import { Check, LoaderCircle } from 'lucide-react';
import { adminApi, type AdminProvider } from '../../services/adminApi';
import { Field, inputClass } from './ui';

export const EMPTY_PROVIDER = {
    provider_id: '',
    dialect: 'openai' as const,
    display_name: '',
    base_url: '',
    model_full: '',
    model_lite: '',
    enabled: true,
    role: 'off' as const,
};

/** Mirrors `PROVIDER_IDS` in the edge function; the server is the authority. */
const KNOWN_PROVIDER_IDS = [
    'deepseek',
    'kimi',
    'anthropic',
    'openai',
    'groq',
    'together',
    'openrouter',
    'mistral',
    'custom',
];

const ProviderEditor: React.FC<{
    initial: Partial<AdminProvider>;
    onSaved: () => void;
    onCancel: () => void;
}> = ({ initial, onSaved, onCancel }) => {
    const [form, setForm] = useState({ ...EMPTY_PROVIDER, ...initial });
    // Blank means "leave the stored keys alone" — see saveProvider.
    const [keysText, setKeysText] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        const providerId = form.provider_id.trim();
        if (!providerId) {
            setError('Provider id is required.');
            return;
        }
        if (!KNOWN_PROVIDER_IDS.includes(providerId)) {
            setError(`Unknown provider id. Use one of: ${KNOWN_PROVIDER_IDS.join(', ')}.`);
            return;
        }
        setSaving(true);
        try {
            const keys = keysText
                .split(/[\n,]/)
                .map((k) => k.trim())
                .filter(Boolean);
            await adminApi.saveProvider({
                ...form,
                provider_id: providerId,
                // Only send keys when the operator actually typed some.
                ...(keys.length > 0 ? { api_keys: keys } : {}),
            });
            onSaved();
        } catch (err) {
            const code = (err as { code?: string }).code;
            setError(
                code === 'role_already_assigned'
                    ? 'Another provider already holds that role. Set it to "off" first.'
                    : code === 'invalid_provider_id'
                      ? 'The server does not recognise that provider id.'
                      : code || 'Could not save the provider.',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="rounded-2xl border border-border bg-white p-5 md:p-6">
            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Provider id" hint="Used by the router, e.g. custom, anthropic, groq.">
                    <input
                        className={inputClass}
                        value={form.provider_id}
                        onChange={(e) => set('provider_id', e.target.value)}
                        placeholder="custom"
                        list="admin-provider-ids"
                        autoCapitalize="none"
                        spellCheck={false}
                    />
                    <datalist id="admin-provider-ids">
                        {KNOWN_PROVIDER_IDS.map((id) => (
                            <option key={id} value={id} />
                        ))}
                    </datalist>
                </Field>
                <Field label="Display name">
                    <input
                        className={inputClass}
                        value={form.display_name}
                        onChange={(e) => set('display_name', e.target.value)}
                        placeholder="My inference host"
                    />
                </Field>
                <Field label="Dialect" hint="Anthropic speaks its own wire format.">
                    <select
                        className={inputClass}
                        value={form.dialect}
                        onChange={(e) => set('dialect', e.target.value as 'openai' | 'anthropic')}
                    >
                        <option value="openai">OpenAI-compatible</option>
                        <option value="anthropic">Anthropic</option>
                    </select>
                </Field>
                <Field label="Routing role" hint="One primary and one fallback at a time.">
                    <select
                        className={inputClass}
                        value={form.role}
                        onChange={(e) => set('role', e.target.value as 'primary' | 'fallback' | 'off')}
                    >
                        <option value="off">Off — never routed to</option>
                        <option value="primary">Primary</option>
                        <option value="fallback">Fallback</option>
                    </select>
                </Field>
                <div className="md:col-span-2">
                    <Field label="Base URL" hint="Leave blank to use the built-in default.">
                        <input
                            className={inputClass}
                            value={form.base_url}
                            onChange={(e) => set('base_url', e.target.value)}
                            placeholder="https://api.example.com/v1"
                            autoCapitalize="none"
                            spellCheck={false}
                        />
                    </Field>
                </div>
                <Field label="Model (full)">
                    <input
                        className={inputClass}
                        value={form.model_full}
                        onChange={(e) => set('model_full', e.target.value)}
                        placeholder="claude-opus-5"
                        autoCapitalize="none"
                        spellCheck={false}
                    />
                </Field>
                <Field label="Model (lite)" hint="Falls back to the full model when blank.">
                    <input
                        className={inputClass}
                        value={form.model_lite}
                        onChange={(e) => set('model_lite', e.target.value)}
                        placeholder="claude-haiku-4-5"
                        autoCapitalize="none"
                        spellCheck={false}
                    />
                </Field>
                <div className="md:col-span-2">
                    <Field
                        label="API keys"
                        hint="One per line. Multiple keys are pooled round-robin. Leave blank to keep the stored keys — they are never shown again once saved."
                    >
                        <textarea
                            className={`${inputClass} min-h-[84px] font-mono text-[13px]`}
                            value={keysText}
                            onChange={(e) => setKeysText(e.target.value)}
                            placeholder="sk-…"
                            autoCapitalize="none"
                            spellCheck={false}
                        />
                    </Field>
                </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-dark">
                <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => set('enabled', e.target.checked)}
                    className="h-4 w-4 accent-primary"
                />
                Enabled
            </label>

            {error && (
                <p role="alert" className="mt-4 text-sm font-medium text-danger">
                    {error}
                </p>
            )}

            <div className="mt-5 flex gap-2">
                <button
                    type="submit"
                    disabled={saving}
                    className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                    {saving ? (
                        <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                    ) : (
                        <Check size={16} aria-hidden="true" />
                    )}
                    Save provider
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="tap-target rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-dark"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
};

export default ProviderEditor;
