import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface PolicyModalProps {
    type: 'user' | 'privacy' | null;
    onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ type, onClose }) => {
    if (!type) return null;

    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-[#1c1917] w-full max-w-lg rounded-[2rem] shadow-2xl p-6 border border-stone-800 flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center border-b border-stone-800 pb-3 shrink-0">
                    <h3 className="font-black text-stone-100 text-lg flex items-center gap-2">
                        <ShieldCheck size={18} className="text-amber-500"/> 
                        {type === 'user' ? '用户协议与免责声明' : '隐私政策'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-stone-500 hover:text-stone-300"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar mt-4 pr-2 space-y-4 text-sm text-stone-300 leading-relaxed">
                    {type === 'user' ? (
                        <>
                            <div className="text-center font-bold text-stone-100 mb-2">玄枢（Xuan-Shu）用户协议与免责声明</div>
                            <div className="text-xs text-stone-500 text-center mb-4">生效日期：2026年01月21日</div>
                            
                            <p>欢迎使用“玄枢”（以下简称“本软件”）。本软件致力于利用现代人工智能技术普及和探索传统命理文化。在您注册或使用本软件服务前，请务必仔细阅读以下条款。一旦您开始使用本软件，即视为您已完全理解并同意本声明的所有内容。</p>
                            
                            <div className="font-bold text-stone-200 mt-4">1. 服务性质声明</div>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><b className="text-amber-500/80">娱乐与文化用途：</b>本软件提供的所有八字排盘、紫微斗数分析、运势解读及AI对话功能，仅作为中国传统民俗文化的研究样本和娱乐用途。</li>
                                <li><b className="text-amber-500/80">非专业建议：</b>本软件生成的内容不应被视为心理咨询、法律建议、医疗诊断或专业的人生指导。</li>
                            </ul>

                            <div className="font-bold text-stone-200 mt-4">2. 财富与投资免责（特别提示）</div>
                            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-200 text-xs">
                                请您特别注意：
                                <ul className="list-disc pl-4 mt-1 space-y-1">
                                    <li><b>绝非投资建议：</b>本软件中的“财富分析”、“投资策略”、“行业适配度”以及文中提及的任何股票、基金、ETF、市场趋势等内容，均为AI模型基于命理逻辑生成的模拟文本，仅为博君一笑，绝对不构成任何形式的金融投资建议或买卖依据。</li>
                                    <li><b>风险自担：</b>金融市场瞬息万变，投资具有极高的风险。用户不应依据本软件的任何输出来制定投资决策。</li>
                                    <li><b>责任豁免：</b>若用户因采信本软件的“财运建议”或“投资标的”而进行任何金融操作，所导致的一切财产损失（包括但不限于本金亏损、预期收益落空），均由用户自行承担，玄枢软件及其开发者团队不承担任何法律责任和经济赔偿责任。</li>
                                </ul>
                            </div>

                            <div className="font-bold text-stone-200 mt-4">3. 准确性与AI局限性</div>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><b className="text-amber-500/80">技术原理：</b>本软件的分析报告由第三方人工智能模型（如 DeepSeek、Gemini 等）基于用户输入的参数生成。AI模型存在“幻觉”现象，可能会生成看似合理但实际无依据的内容。</li>
                                <li><b className="text-amber-500/80">无准确性保证：</b>我们不对排盘结果的准确性、完整性、时效性或适用性做任何承诺。命理学本身属于玄学范畴，缺乏科学实证支持，请用户保持理性，切勿迷信。</li>
                            </ul>

                            <div className="font-bold text-stone-200 mt-4">4. 账号与服务</div>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>用户在使用邮箱注册（通过 Supabase 服务）时，应妥善保管账号密码。</li>
                                <li>本软件包含部分付费功能（如开通AI功能的VIP），一旦服务（如生成深度报告）完成交付，鉴于数字内容的特殊性，原则上不予退款，除非因技术故障导致无法获取报告。</li>
                            </ul>

                            <div className="font-bold text-stone-200 mt-4">5. 知识产权</div>
                            <p>本软件的源代码、界面设计及算法逻辑受版权法保护。用户仅拥有一份非排他性的个人使用许可，不得对本软件进行反向工程、破解或用于商业转售。</p>
                        </>
                    ) : (
                        <>
                            <div className="text-center font-bold text-stone-100 mb-2">玄枢（Xuan-Shu）隐私政策</div>
                            <div className="text-xs text-stone-500 text-center mb-4">生效日期：2026年01月21日</div>
                            
                            <p>玄枢（以下简称“我们”）非常重视您的隐私。本政策旨在说明我们如何收集、使用和保护您的个人信息。</p>
                            
                            <div className="font-bold text-stone-200 mt-4">1. 我们收集的信息</div>
                            <p>为了提供排盘和分析服务，我们需要收集以下信息：</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><b>注册信息：</b>您的电子邮箱地址（用于账号验证和找回密码）。</li>
                                <li><b>命理数据：</b>您输入的出生日期、时间、性别及出生地点（用于生成八字和紫微斗数盘）。</li>
                                <li><b>支付信息：</b>当您购买会员服务时，我们会记录交易状态（通过支付宝接口），但不会保存您的银行卡号或支付密码。</li>
                                <li><b>设备信息：</b>用于适配界面和网络安全的浏览器类型及基本日志。</li>
                            </ul>

                            <div className="font-bold text-stone-200 mt-4">2. 信息的使用方式</div>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><b>核心功能：</b>使用您的出生数据进行算法排盘。</li>
                                <li><b className="text-amber-500/80">AI分析（重要提示）：</b>为了生成详细的运势报告，我们会将您的排盘参数（如干支结构、五行分布）及相关的提示词发送给第三方人工智能服务提供商（如 DeepSeek 或 Google Gemini API）。这些数据仅用于生成当次报告，我们不会授权第三方将其用于模型训练。</li>
                                <li><b>服务通知：</b>通过邮箱向您发送账号激活、密码重置或重要服务更新通知。</li>
                            </ul>

                            <div className="font-bold text-stone-200 mt-4">3. 信息存储与保护</div>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><b>数据存储：</b>您的账号及核心数据存储于 Supabase 提供的云端数据库中，受行业标准的加密技术保护。</li>
                                <li><b>本地存储：</b>为了提升体验，部分设置和临时数据可能会存储在您浏览器的 LocalStorage 中。</li>
                                <li><b>安全承诺：</b>我们承诺不会向任何无关第三方出售、出租或交易您的个人敏感信息，除非法律法规强制要求。</li>
                            </ul>

                            <div className="font-bold text-stone-200 mt-4">4. 第三方服务</div>
                            <p>本软件集成了以下第三方服务，它们可能会依据其隐私政策处理您的数据：</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Supabase：提供身份认证和数据库服务。</li>
                                <li>DeepSeek / Gemini：提供人工智能文本生成服务。</li>
                                <li>支付宝 (Alipay)：提供支付结算服务。</li>
                            </ul>

                            <div className="font-bold text-stone-200 mt-4">5. 用户权利</div>
                            <p>您有权随时联系我们要求：</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>查阅您的个人信息副本。</li>
                                <li>更正不准确的信息。</li>
                                <li>注销账号并删除所有云端数据。</li>
                            </ul>

                            <div className="font-bold text-stone-200 mt-4">6. 联系我们</div>
                            <p>如对本隐私政策有任何疑问，或需要行使数据权利，请通过以下方式联系：</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>联系邮箱：[sinslust@163.com]</li>
                            </ul>
                        </>
                    )}
                </div>
                <div className="pt-4 border-t border-stone-800 shrink-0">
                    <button onClick={onClose} className="w-full py-3 bg-stone-800 text-stone-300 rounded-xl font-bold hover:bg-stone-700 transition-colors">我已阅读并知晓</button>
                </div>
            </div>
        </div>
    );
};
