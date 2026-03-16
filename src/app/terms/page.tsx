import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "利用規約",
  description: "NipoAIの利用規約です。サービスのご利用にあたっての条件をご確認ください。",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ── */}
      <header className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              N
            </div>
            <span className="text-lg font-bold text-gray-900">NipoAI</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              ログイン
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-8 items-center justify-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              無料で始める
            </Link>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">利用規約</h1>
        <p className="mt-2 text-sm text-gray-500">最終更新日: 2026年3月14日</p>

        <div className="prose prose-gray mt-10 max-w-none prose-headings:font-bold prose-h2:mt-10 prose-h2:text-xl prose-h3:mt-6 prose-h3:text-base prose-p:text-sm prose-p:leading-relaxed prose-li:text-sm prose-li:leading-relaxed">
          <h2>第1条（適用）</h2>
          <ol>
            <li>
              本利用規約（以下「本規約」といいます。）は、NipoAI運営者（以下「当方」といいます。）が提供するサービス「NipoAI」（以下「本サービス」といいます。）の利用に関する条件を、本サービスを利用するすべてのお客様（以下「ユーザー」といいます。）と当方との間で定めるものです。
            </li>
            <li>
              ユーザーは、本規約に同意の上、本サービスを利用するものとします。本サービスのアカウント登録を行った時点で、本規約に同意したものとみなします。
            </li>
            <li>
              当方が本サービス上で随時掲示するガイドライン、注意事項等（以下「個別規定」といいます。）は、本規約の一部を構成するものとします。本規約と個別規定が矛盾する場合は、個別規定が優先するものとします。
            </li>
          </ol>

          <h2>第2条（サービスの概要）</h2>
          <ol>
            <li>
              本サービスは、Slackの会話履歴をAI（人工知能）技術を用いて分析し、日報を自動生成するSaaS（Software as a Service）です。
            </li>
            <li>
              本サービスは、Slack APIを通じてユーザーが指定したチャンネルのメッセージを取得し、OpenAI社のAPIを利用して日報を生成します。
            </li>
            <li>
              本サービスの利用には、Slackワークスペースへのアクセス権限が必要です。
            </li>
          </ol>

          <h2>第3条（アカウント登録）</h2>
          <ol>
            <li>
              本サービスの利用を希望する方は、当方が定める方法によりアカウント登録を行うものとします。
            </li>
            <li>
              ユーザーは、登録情報について正確かつ最新の情報を提供し、常にこれを維持・更新する義務を負います。
            </li>
            <li>
              ユーザーは、自己のアカウントの認証情報を適切に管理する責任を負い、第三者に利用させ、または貸与、譲渡、売買等をしてはならないものとします。
            </li>
            <li>
              アカウントの認証情報の管理不十分、使用上の過誤、第三者の使用等によって生じた損害に関する責任は、ユーザーが負うものとし、当方は一切の責任を負いません。
            </li>
          </ol>

          <h2>第4条（料金および支払い）</h2>
          <ol>
            <li>
              本サービスには、無料プラン（Free）および有料プラン（Starter: 月額550円（税込）、Team: 月額1,250円（税込））があります。
            </li>
            <li>
              有料プランの決済は、Stripe, Inc.が提供する決済サービス（以下「Stripe」といいます。）を通じて処理されます。ユーザーは、Stripeの利用規約およびプライバシーポリシーに同意した上で決済を行うものとします。
            </li>
            <li>
              有料プランは月額の自動更新制です。更新日の前日までにユーザーが解約手続きを行わない場合、翌月も同一プランが自動的に更新されます。
            </li>
<li>
              プランの変更（アップグレード・ダウングレード）は、ダッシュボードから随時行うことができます。アップグレードの場合は即時適用され、日割りで差額が請求されます。ダウングレードの場合は、現在の請求期間の終了時に適用されます。
            </li>
            <li>
              解約はいつでも可能です。解約した場合、現在の請求期間の終了まで有料プランの機能をご利用いただけます。既に支払済みの料金の返金は行いません。ただし、初回の支払いから8日以内の場合は、電子消費者契約法に基づき返金に応じる場合があります。
            </li>
            <li>
              当方は、30日前までにユーザーに通知することにより、料金を改定することができるものとします。
            </li>
          </ol>

          <h2>第5条（禁止事項）</h2>
          <p>
            ユーザーは、本サービスの利用にあたり、以下の行為をしてはならないものとします。
          </p>
          <ol>
            <li>法令または公序良俗に違反する行為</li>
            <li>犯罪行為に関連する行為</li>
            <li>
              本サービスのサーバーまたはネットワークの機能を破壊したり、妨害したりする行為
            </li>
            <li>本サービスの運営を妨害するおそれのある行為</li>
            <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
            <li>不正アクセスをし、またはこれを試みる行為</li>
            <li>他のユーザーに成りすます行為</li>
            <li>
              本サービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為
            </li>
            <li>
              本サービスのリバースエンジニアリング、逆コンパイル、逆アセンブルその他これらに準ずる行為
            </li>
            <li>本サービスを再販売、再配布、またはサブライセンスする行為</li>
            <li>
              本サービスのAPIまたはシステムに対して、過度な負荷をかけるリクエストを送信する行為
            </li>
            <li>
              自動化されたスクリプト、ボット等を用いて本サービスにアクセスする行為（当方が明示的に許可した場合を除く）
            </li>
            <li>その他、当方が不適切と合理的に判断する行為</li>
          </ol>

          <h2>第6条（知的財産権）</h2>
          <ol>
            <li>
              本サービスに関する著作権、商標権その他一切の知的財産権は、当方または正当な権利を有する第三者に帰属します。
            </li>
            <li>
              本サービスを通じてAIが生成した日報の内容に関する権利は、当該日報を生成したユーザー（またはユーザーが属する組織）に帰属します。ただし、当方は本サービスの改善・開発の目的で、匿名化・統計化した形でデータを利用できるものとします。
            </li>
            <li>
              ユーザーは、本サービスの利用により得たコンテンツを、本規約および法令の範囲内で自由に利用できるものとします。
            </li>
          </ol>

          <h2>第7条（AI生成コンテンツに関する免責）</h2>
          <ol>
            <li>
              本サービスが生成する日報は、AIによる自動生成であり、その内容の正確性、完全性、有用性、特定目的への適合性等について、当方は一切保証しません。
            </li>
            <li>
              ユーザーは、AI生成コンテンツの内容を自己の責任において確認し、必要に応じて編集・修正した上で利用するものとします。
            </li>
            <li>
              AI生成コンテンツに基づいてユーザーまたは第三者に生じた損害について、当方は一切の責任を負いません。
            </li>
            <li>
              AIの技術的特性上、生成される日報の品質や内容は、入力データの質・量に依存します。当方は、生成結果の品質について一定の水準を保証するものではありません。
            </li>
          </ol>

          <h2>第8条（サービスの変更・中断・終了）</h2>
          <ol>
            <li>
              当方は、ユーザーへの事前の通知なく、本サービスの内容を変更し、または本サービスの提供を中断することができるものとします。ただし、重要な変更の場合は、合理的な期間をもって事前に通知するよう努めます。
            </li>
            <li>
              当方は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を一時的に中断することができるものとします。
              <ul>
                <li>本サービスにかかるシステムの保守点検または更新を行う場合</li>
                <li>
                  地震、落雷、火災、停電または天災等の不可抗力により、本サービスの提供が困難となった場合
                </li>
                <li>
                  第三者が提供するサービス（Slack API、OpenAI API等）の障害または仕様変更等により、本サービスの提供が困難となった場合
                </li>
                <li>その他、当方が本サービスの提供が困難と合理的に判断した場合</li>
              </ul>
            </li>
            <li>
              当方は、30日前までにユーザーに通知することにより、本サービスを終了することができるものとします。この場合、当方は有料プランの未使用期間に相当する料金を日割りで返金するものとします。
            </li>
          </ol>

          <h2>第9条（利用制限およびアカウントの停止・削除）</h2>
          <ol>
            <li>
              当方は、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、ユーザーに対して本サービスの全部もしくは一部の利用を制限し、またはユーザーとしてのアカウントを停止もしくは削除することができるものとします。
              <ul>
                <li>本規約のいずれかの条項に違反した場合</li>
                <li>登録事項に虚偽の事実があることが判明した場合</li>
                <li>料金等の支払債務の不履行があった場合</li>
                <li>
                  その他、当方が本サービスの利用を適当でないと合理的に判断した場合
                </li>
              </ul>
            </li>
            <li>
              当方は、本条に基づき当方が行った行為によりユーザーに生じた損害について、一切の責任を負いません。
            </li>
          </ol>

          <h2>第10条（免責事項）</h2>
          <ol>
            <li>
              当方は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティに関する欠陥、エラーやバグ、権利侵害等を含みます。）がないことを明示的にも黙示的にも保証しておりません。
            </li>
            <li>
              当方は、本サービスに起因してユーザーに生じたあらゆる損害について、当方の故意または重大な過失による場合を除き、一切の責任を負いません。
            </li>
            <li>
              当方は、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。
            </li>
          </ol>

          <h2>第11条（損害賠償の制限）</h2>
          <ol>
            <li>
              本サービスに関して当方がユーザーに対して負う損害賠償責任の範囲は、当方の故意または重大な過失に起因する場合に限られるものとします。
            </li>
            <li>
              前項の場合においても、当方の損害賠償責任は、損害の事由が生じた時点から遡って過去12か月間にユーザーが当方に支払った利用料金の総額を上限とするものとします。ただし、無料プランのユーザーに対する賠償額の上限は0円とします。
            </li>
            <li>
              当方は、付随的損害、間接損害、特別損害、将来の損害および逸失利益にかかる損害については、賠償する責任を負わないものとします。
            </li>
            <li>
              消費者契約法その他の強行法規の適用により、本条の免責または制限が適用されない場合があります。その場合、当方の責任は法令が許容する最大限度において制限されるものとします。
            </li>
          </ol>

          <h2>第12条（秘密保持）</h2>
          <ol>
            <li>
              当方は、本サービスの提供を通じて取得したユーザーの情報（Slackメッセージ、生成された日報等を含みます。）を秘密として取り扱い、ユーザーの事前の承諾なく第三者に開示・漏洩しないものとします。ただし、本サービスの提供に必要な範囲での外部サービス（OpenAI API等）への送信を除きます。
            </li>
            <li>
              前項の規定にかかわらず、法令に基づく開示要求がある場合、当方は必要最小限の範囲でユーザーの情報を開示することがあります。
            </li>
          </ol>

          <h2>第13条（個人情報の取扱い）</h2>
          <p>
            当方は、本サービスの利用によって取得する個人情報について、当方の
            <Link href="/privacy" className="text-blue-600 hover:underline">
              プライバシーポリシー
            </Link>
            に従い適切に取り扱うものとします。
          </p>

          <h2>第14条（通知または連絡）</h2>
          <ol>
            <li>
              ユーザーと当方との間の通知または連絡は、当方の定める方法（メール、本サービス上の通知等）によって行うものとします。
            </li>
            <li>
              当方がユーザーの登録メールアドレスに通知を送信した場合、発信時にユーザーに到達したものとみなします。
            </li>
          </ol>

          <h2>第15条（権利義務の譲渡の禁止）</h2>
          <p>
            ユーザーは、当方の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
          </p>

          <h2>第16条（準拠法および管轄裁判所）</h2>
          <ol>
            <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
            <li>
              本サービスに関して紛争が生じた場合には、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </li>
          </ol>

          <h2>第17条（分離可能性）</h2>
          <p>
            本規約のいずれかの条項またはその一部が、消費者契約法その他の法令等により無効または執行不能と判断された場合であっても、本規約の残りの条項および一部が無効または執行不能と判断された条項の残りの部分は、継続して完全に効力を有するものとします。
          </p>

          <h2>第18条（規約の変更）</h2>
          <ol>
            <li>
              当方は、以下の場合に、ユーザーの個別の同意を要せず、本規約を変更することができるものとします。
              <ul>
                <li>本規約の変更がユーザーの一般の利益に適合するとき</li>
                <li>
                  本規約の変更が契約の目的に反せず、かつ、変更の必要性、変更後の内容の相当性その他の変更に係る事情に照らして合理的なものであるとき
                </li>
              </ul>
            </li>
            <li>
              当方は、本規約を変更する場合、変更後の本規約の施行時期および内容を、本サービス上での掲示またはメールによる通知その他の適切な方法により、施行の14日前までにユーザーに周知するものとします。
            </li>
            <li>
              変更後の本規約の施行日以降に本サービスを利用した場合、ユーザーは変更後の規約に同意したものとみなします。
            </li>
          </ol>

          <hr className="my-10" />

          <p>
            <strong>運営者</strong>: NipoAI運営者
            <br />
            <strong>メール</strong>:{" "}
            <a href="mailto:nipoaisupport@gmail.com" className="text-blue-600 hover:underline">
              nipoaisupport@gmail.com
            </a>
            <br />
            <strong>URL</strong>:{" "}
            <a
              href="https://nipoai.app"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://nipoai.app
            </a>
          </p>
          <p>2026年3月14日 制定・施行</p>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                N
              </div>
              <span className="font-semibold text-gray-900">NipoAI</span>
            </Link>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
              <Link href="/terms" className="transition-colors hover:text-gray-900">
                利用規約
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-gray-900">
                プライバシーポリシー
              </Link>
              <Link href="mailto:nipoaisupport@gmail.com" className="transition-colors hover:text-gray-900">
                お問い合わせ
              </Link>
            </div>
            <p className="text-xs text-gray-400">
              &copy; 2026 NipoAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
