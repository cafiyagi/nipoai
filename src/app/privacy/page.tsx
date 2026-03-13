import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "NipoAIのプライバシーポリシーです。個人情報の取り扱いについてご確認ください。",
};

export default function PrivacyPage() {
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
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          プライバシーポリシー
        </h1>
        <p className="mt-2 text-sm text-gray-500">最終更新日: 2026年3月14日</p>

        <div className="prose prose-gray mt-10 max-w-none prose-headings:font-bold prose-h2:mt-10 prose-h2:text-xl prose-h3:mt-6 prose-h3:text-base prose-p:text-sm prose-p:leading-relaxed prose-li:text-sm prose-li:leading-relaxed">
          <p>
            NipoAI運営者（以下「当方」といいます。）は、「NipoAI」（以下「本サービス」といいます。）における個人情報の取扱いについて、個人情報の保護に関する法律（以下「個人情報保護法」といいます。）その他関連法令を遵守し、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。
          </p>

          <h2>第1条（収集する個人情報）</h2>
          <p>当方は、本サービスの提供にあたり、以下の個人情報を収集します。</p>

          <h3>1. ユーザーが直接提供する情報</h3>
          <ul>
            <li>
              <strong>アカウント情報</strong>: 氏名、メールアドレス
            </li>
            <li>
              <strong>決済情報</strong>:
              クレジットカード情報（Stripeが直接処理し、当方はカード番号等を保持しません）
            </li>
            <li>
              <strong>お問い合わせ情報</strong>: お問い合わせ内容、メールアドレス
            </li>
          </ul>

          <h3>2. Slack連携により取得する情報</h3>
          <ul>
            <li>
              <strong>Slackユーザー情報</strong>: Slackユーザー名、ユーザーID、ワークスペース情報
            </li>
            <li>
              <strong>Slackメッセージデータ</strong>:
              ユーザーが指定したチャンネルのメッセージ内容（日報生成のために一時的に取得し、生成処理完了後は保持しません）
            </li>
            <li>
              <strong>Slack Bot Token</strong>:
              Slack APIへのアクセスに必要な認証トークン（AES-256-GCM方式で暗号化して保管）
            </li>
          </ul>

          <h3>3. 本サービスの利用により生成・蓄積される情報</h3>
          <ul>
            <li>
              <strong>生成された日報データ</strong>:
              AIが生成した日報の内容（Supabaseデータベースに保存）
            </li>
            <li>
              <strong>利用履歴</strong>:
              サービスの利用日時、利用機能、操作ログ
            </li>
          </ul>

          <h3>4. 自動的に収集される情報</h3>
          <ul>
            <li>
              <strong>アクセスログ</strong>: IPアドレス、ブラウザの種類、アクセス日時
            </li>
            <li>
              <strong>Cookie情報</strong>: セッション管理、認証状態の維持に使用
            </li>
          </ul>

          <h2>第2条（個人情報の利用目的）</h2>
          <p>
            当方は、収集した個人情報を以下の目的で利用します。個人情報保護法第17条に基づき、以下に定める利用目的の範囲内でのみ個人情報を取り扱います。
          </p>
          <ol>
            <li>本サービスの提供・運営（日報の自動生成を含む）</li>
            <li>ユーザーの本人確認・認証</li>
            <li>有料プランの料金請求・決済処理</li>
            <li>
              本サービスの改善・新機能の開発（匿名化・統計化した形でのデータ分析を含む）
            </li>
            <li>
              ユーザーへの重要なお知らせの通知（サービスの変更、メンテナンス、セキュリティに関する通知等）
            </li>
            <li>ユーザーからのお問い合わせへの対応</li>
            <li>
              利用規約に違反する行為への対応（不正利用の防止・検出を含む）
            </li>
            <li>上記に付随する業務</li>
          </ol>

          <h2>第3条（第三者への提供・委託）</h2>
          <p>
            当方は、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。
          </p>

          <h3>1. サービス提供に必要な外部サービスへの送信</h3>
          <p>
            本サービスの提供にあたり、以下の外部サービスにデータを送信します。これは個人情報保護法第27条第5項第1号に基づく委託に該当します。
          </p>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>送信先</th>
                  <th>送信されるデータ</th>
                  <th>目的</th>
                  <th>プライバシーポリシー</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>OpenAI, Inc.</td>
                  <td>Slackメッセージの内容（一時的）</td>
                  <td>AI日報生成処理</td>
                  <td>
                    <a
                      href="https://openai.com/policies/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      リンク
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>Stripe, Inc.</td>
                  <td>決済に必要な情報</td>
                  <td>料金の決済処理</td>
                  <td>
                    <a
                      href="https://stripe.com/jp/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      リンク
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>Supabase, Inc.</td>
                  <td>アカウント情報、日報データ</td>
                  <td>データベースホスティング</td>
                  <td>
                    <a
                      href="https://supabase.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      リンク
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>Slack Technologies, LLC</td>
                  <td>認証情報</td>
                  <td>Slack APIとの連携</td>
                  <td>
                    <a
                      href="https://slack.com/intl/ja-jp/trust/privacy/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      リンク
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>2. OpenAI APIへのデータ送信について</h3>
          <p>
            本サービスでは、日報生成のためにSlackメッセージの内容をOpenAI社のAPI（GPT-4o-mini）に送信します。この送信について、以下の点をご了承ください。
          </p>
          <ul>
            <li>
              送信されたデータは、OpenAI社のAPIデータ利用ポリシーに基づき取り扱われます。当方はOpenAI API経由で送信されたデータがOpenAI社のモデル学習に使用されない設定（API利用）で運用しています。
            </li>
            <li>
              送信されるデータには、Slackメッセージに含まれるユーザー名やメッセージ内容が含まれる場合があります。
            </li>
            <li>
              OpenAI社のサーバーは米国に所在しており、データは米国に一時的に転送されます。
            </li>
          </ul>

          <h3>3. 法令に基づく場合</h3>
          <p>以下の場合、ユーザーの同意を得ずに個人情報を提供することがあります。</p>
          <ul>
            <li>法令に基づく場合（個人情報保護法第27条第1項各号）</li>
            <li>
              人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき
            </li>
            <li>
              公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき
            </li>
            <li>
              国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合
            </li>
          </ul>

          <h2>第4条（Cookieの使用）</h2>
          <ol>
            <li>
              本サービスは、以下の目的でCookieを使用します。
              <ul>
                <li>
                  <strong>必須Cookie</strong>:
                  ユーザーの認証状態の維持、セッション管理に使用します。本サービスの基本機能に必要であり、無効にすることはできません。
                </li>
                <li>
                  <strong>機能Cookie</strong>:
                  ユーザーの設定・環境設定の保持に使用します。
                </li>
              </ul>
            </li>
            <li>
              本サービスでは、広告目的やトラッキング目的のCookieは使用しておりません。
            </li>
            <li>
              ユーザーは、ブラウザの設定によりCookieの受け入れを拒否することができますが、その場合、本サービスの一部の機能が利用できなくなる場合があります。
            </li>
          </ol>

          <h2>第5条（データの保管場所）</h2>
          <ol>
            <li>
              ユーザーのアカウント情報および日報データは、Supabase, Inc.が提供するクラウドデータベースサービスに保管されます。データの物理的な保管場所は、AWSの東京リージョン（ap-northeast-1）または米国リージョンです。
            </li>
            <li>
              Slack Bot Tokenは、AES-256-GCM方式で暗号化した上で保管されます。
            </li>
            <li>
              Slackから取得したメッセージデータは、日報生成処理のためにサーバー上で一時的に処理されますが、処理完了後は保持されません。
            </li>
            <li>
              決済情報（クレジットカード情報等）は、Stripe, Inc.のPCI DSS準拠環境に保管され、当方のサーバーには保持されません。
            </li>
          </ol>

          <h2>第6条（データの保持期間）</h2>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>データの種類</th>
                  <th>保持期間</th>
                  <th>削除方法</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>アカウント情報</td>
                  <td>アカウント削除まで</td>
                  <td>ユーザーによる削除またはアカウント削除時</td>
                </tr>
                <tr>
                  <td>日報データ</td>
                  <td>アカウント削除まで</td>
                  <td>ユーザーによる個別削除またはアカウント削除時</td>
                </tr>
                <tr>
                  <td>Slackメッセージデータ</td>
                  <td>日報生成処理完了まで（一時的）</td>
                  <td>処理完了後に自動削除</td>
                </tr>
                <tr>
                  <td>アクセスログ</td>
                  <td>最大90日間</td>
                  <td>期間経過後に自動削除</td>
                </tr>
                <tr>
                  <td>決済情報</td>
                  <td>Stripeのポリシーに従う</td>
                  <td>Stripeのポリシーに従う</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            アカウント削除後、当方は30日以内に当該ユーザーの個人情報を削除します。ただし、法令により保存が義務付けられている場合は、当該法令の定める期間保存した後に削除します。
          </p>

          <h2>第7条（ユーザーの権利）</h2>
          <p>
            ユーザーは、個人情報保護法に基づき、以下の権利を有します。当方は、ユーザーからの請求に対し、法令に定める期間内に対応します。
          </p>
          <ol>
            <li>
              <strong>開示請求権</strong>（法第33条）:
              当方が保有するユーザーの個人情報の開示を請求することができます。
            </li>
            <li>
              <strong>訂正・追加・削除請求権</strong>（法第34条）:
              個人情報の内容が事実でない場合に、訂正、追加または削除を請求することができます。
            </li>
            <li>
              <strong>利用停止・消去請求権</strong>（法第35条）:
              個人情報が利用目的の範囲を超えて取り扱われている場合や、不正に取得された場合に、利用停止または消去を請求することができます。
            </li>
            <li>
              <strong>第三者提供停止請求権</strong>（法第35条第5項）:
              個人情報が本人の同意なく第三者に提供されている場合に、提供の停止を請求することができます。
            </li>
            <li>
              <strong>データポータビリティ</strong>:
              ユーザーは、ダッシュボードからご自身の日報データをCSVまたはPDF形式でエクスポートすることができます。アカウント情報の提供を希望される場合は、下記のお問い合わせ先までご連絡ください。
            </li>
          </ol>
          <p>
            上記の権利行使を希望される場合は、本人確認の上、下記のお問い合わせ先までご連絡ください。正当な理由なくこれを拒否することはありません。
          </p>

          <h2>第8条（セキュリティ対策）</h2>
          <p>
            当方は、個人情報の漏洩、滅失またはき損の防止のために、以下のセキュリティ対策を講じています。
          </p>
          <ul>
            <li>
              <strong>通信の暗号化</strong>:
              すべての通信はHTTPS（TLS 1.2以上）により暗号化されています。
            </li>
            <li>
              <strong>認証トークンの暗号化</strong>: Slack Bot
              TokenはAES-256-GCM方式で暗号化して保管しています。
            </li>
            <li>
              <strong>アクセス制御</strong>:
              個人情報へのアクセスは、業務上必要な範囲に限定しています。
            </li>
            <li>
              <strong>決済情報の非保持</strong>:
              クレジットカード情報は、PCI DSS準拠のStripe環境で処理され、当方のサーバーには保持されません。
            </li>
            <li>
              <strong>データベースのセキュリティ</strong>:
              SupabaseのRow Level Security（RLS）を利用し、ユーザーは自身のデータのみにアクセスできるよう制限しています。
            </li>
          </ul>

          <h2>第9条（個人情報の安全管理措置）</h2>
          <p>
            当方は、個人情報保護法第23条に基づき、以下の安全管理措置を講じています。
          </p>
          <ul>
            <li>
              <strong>組織的安全管理措置</strong>:
              個人情報の取扱いに関する責任者を設置し、取扱い規程を整備しています。
            </li>
            <li>
              <strong>人的安全管理措置</strong>:
              個人情報の取扱いに関する留意事項について、定期的な確認を行っています。
            </li>
            <li>
              <strong>物理的安全管理措置</strong>:
              クラウドサービスを利用し、物理的なサーバー管理はクラウドプロバイダーのセキュリティ基準に準拠しています。
            </li>
            <li>
              <strong>技術的安全管理措置</strong>:
              アクセス制御、暗号化、ログの監視等の技術的対策を実施しています。
            </li>
            <li>
              <strong>外的環境の把握</strong>:
              個人情報を取り扱う外部サービス（米国のOpenAI、Supabase、Stripe等）のセキュリティ体制およびプライバシーポリシーを確認し、適切な保護措置が講じられていることを確認しています。
            </li>
          </ul>

          <h2>第10条（越境移転について）</h2>
          <p>
            本サービスでは、日報生成のためにSlackメッセージの内容を米国のOpenAI社のサーバーに送信します。また、データベースサービスとして利用するSupabase, Inc.のサーバーは米国に所在する場合があります。
          </p>
          <p>
            これらの外国にある第三者への個人データの提供について、個人情報保護法第28条に基づき、以下の情報を提供します。
          </p>
          <ul>
            <li>
              <strong>移転先の国</strong>: 米国
            </li>
            <li>
              <strong>当該国における個人情報の保護に関する制度</strong>:
              米国には連邦レベルでの包括的な個人情報保護法は存在しませんが、各州法（カリフォルニア州消費者プライバシー法等）や業界規制により個人情報が保護されています。
            </li>
            <li>
              <strong>移転先が講じている保護措置</strong>:
              OpenAI社、Supabase社およびStripe社は、それぞれのプライバシーポリシーに基づき適切な保護措置を講じています。
            </li>
          </ul>

          <h2>第11条（お問い合わせ窓口）</h2>
          <p>
            本ポリシーに関するお問い合わせ、個人情報の開示・訂正・削除等のご請求は、以下の窓口までご連絡ください。
          </p>
          <ul>
            <li>
              <strong>個人情報取扱事業者</strong>: NipoAI運営者
            </li>
            <li>
              <strong>メールアドレス</strong>:{" "}
              <a
                href="mailto:nipoaisupport@gmail.com"
                className="text-blue-600 hover:underline"
              >
                nipoaisupport@gmail.com
              </a>
            </li>
          </ul>
          <p>
            お問い合わせの際は、本人確認のため、ご登録のメールアドレスからご連絡ください。原則として、受付後14日以内に回答いたします。
          </p>

          <h2>第12条（本ポリシーの変更）</h2>
          <ol>
            <li>
              当方は、法令の改正、本サービスの変更、その他の事由により、本ポリシーを変更する場合があります。
            </li>
            <li>
              本ポリシーを変更する場合、変更後の内容を本サービス上での掲示またはメールにより、変更の効力発生日の14日前までにユーザーに通知します。
            </li>
            <li>
              個人情報の利用目的の変更その他重要な変更については、ユーザーに改めて同意を求める場合があります。
            </li>
          </ol>

          <hr className="my-10" />

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
