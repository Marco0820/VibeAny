# Payments Setup Guide

本指南说明如何在各支付渠道中获取测试/生产凭据、配置 1 日试用以及对接 PAYG 计费。所有配置均基于现有产品 SKU/价格 ID，不需要新增资源。

---

## 1. 环境变量总览

在项目根目录的 `.env` 中补充以下变量（示例值为测试环境）：

```bash
# Stripe
STRIPE_API_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_CURRENCY=usd

# Creem
CREEM_API_KEY=creem_test_xxx
CREEM_WEBHOOK_SECRET=creem_whsec_xxx
CREEM_BASE_URL=https://api.creem.io
CREEM_SUCCESS_URL=https://example.com/success
CREEM_CANCEL_URL=https://example.com/cancel

# PayPal
PAYPAL_CLIENT_ID=paypal_test_client_id
PAYPAL_CLIENT_SECRET=paypal_test_secret
PAYPAL_WEBHOOK_ID=paypal_whid_xxx
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_CURRENCY=usd
```

复制 `.env.example` 后按需修改即可；部署生产环境时将这些变量写入对应的秘密管理器（例如 Vercel/Render/自建 KMS）。

---

## 2. Stripe

1. **获取 API Key**
   - 登录 [Stripe Dashboard](https://dashboard.stripe.com/)。
   - 进入 **Developers → API keys**。
   - 使用已有的 Secret key（测试为 `sk_test_*`，生产为 `sk_live_*`），粘贴到 `STRIPE_API_KEY`。
   - 同一页面复制 Publishable key 填入 `STRIPE_PUBLISHABLE_KEY`。

2. **Webhook Secret**
   - 在 **Developers → Webhooks** 创建一个指向 `https://<your-api-domain>/api/billing/webhook` 的端点。
   - 选择事件：`payment_intent.succeeded`、`payment_intent.payment_failed`。
   - 复制生成的 `Signing secret` 填入 `STRIPE_WEBHOOK_SECRET`。

3. **产品与价格 ID**
   - 在 **Products** 中复用现有的 Free / Pro / Scale / Enterprise 价格（Price ID 与当前线上保持一致）。
   - 确认价格的试用设置为 **1 day free trial**；如产品不支持试用，可在 Price 下的 **Trial period days** 中设置为 `1`。

   prod_TH9vh5ScJDbjKJ
   prod_TH9xhDNqk9uqTB
   prod_TH9yHg32oRvcOM
   prod_THA0IAL6b2FzgB

4. **测试 / 生产切换**
   - 使用 Dashboard 左上角的 `Viewing test data` 开关切换环境，并分别复制 key。
   - 本地调试可使用 [Stripe CLI](https://stripe.com/docs/stripe-cli)：
     ```bash
     # 在 apps/api 目录
     stripe listen --forward-to localhost:8080/api/billing/webhook
     ```

5. **PAYG 账单**
   - Stripe 的超额费用默认合并到月账单中（调用 `BillingService.ensure_budget_guard` 管控额度）。
   - 如需变为即时扣款，可在后续迭代中调整 `BillingService._create_payg_charge` 与发票逻辑。

---

## 3. Creem

1. **API Key / Webhook**
   - 登录 Creem 后台，保持使用当前项目已有的 API Key、Webhook Secret（无需新建）。
   - 将 Key 填入 `CREEM_API_KEY`，Webhook Secret 填入 `CREEM_WEBHOOK_SECRET`。
   - 确保 Webhook 回调 URL 指向 `https://<your-api-domain>/api/billing/webhook/creem`（与现有配置相同）。

2. **产品 SKU / 价格**
   - 继续沿用现有 SKU（Free / Pro / Scale / Enterprise）。如需变更价格，请在 Creem 控制台修改并同步到 PRD。

3. **试用政策**
   - Creem 支持 1 日试用，保持现有 Trial 设置不变。

4. **PAYG 即时扣款**
   - Creem 的 PAYG 费用采用即时扣款，Webhook 成功后调用 `BillingService.consume` 并同步 `OverageCharge` 状态为 `paid`。

---

## 4. PayPal

1. **API 凭据**
   - 登录 [PayPal Developer Dashboard](https://developer.paypal.com/)。
   - 在 **Sandbox → Apps & Credentials** 里选择已有的应用，复制 `Client ID`、`Secret` 到 `PAYPAL_CLIENT_ID`、`PAYPAL_CLIENT_SECRET`。
   - Webhook ID 同样在该页面获取，填入 `PAYPAL_WEBHOOK_ID`。
   - 生产环境切换至 **Live** 选项获取正式凭据。

2. **产品与计划**
   - 复用现有的订阅计划（保持 Plan ID 不变），确认 `Trial period` 为 1 天。

3. **PAYG 费用**
   - PAYG 费用通过单次订单（Orders API）结算。Webhook `CHECKOUT.ORDER.APPROVED` 到达后即可发放额度，并把 `OverageCharge` 标记为 `paid`。

---

## 5. 验证流程速查

1. **本地开发**
   ```bash
   cd apps/api
   uvicorn app.main:app --reload --app-dir apps/api
   # 单独执行维护脚本（可配合 cron）
   python -m app.scripts.billing_tasks --task daily
   ```
2. **触发测试支付**
   - Stripe：用官方测试卡 `4242 4242 4242 4242 / 03/30 / 123`。
   - PayPal：使用 Sandbox buyer 账号完成一次订单。
   - Creem：调用其测试 API 触发 webhooks（遵循当前项目维护的步骤）。

3. **确认额度**
   - 查询 `/api/billing/usage`、`/api/billing/plans`。
   - 检查数据库表 `allowances`、`consumption_events`、`budget_guards`、`overage_charges`，确保记录与支付事件匹配。

---

## 6. 常见问题

| 场景 | 处理方法 |
| --- | --- |
| Webhook 验证失败 | 确认 `STRIPE_WEBHOOK_SECRET` / `CREEM_WEBHOOK_SECRET` / `PAYPAL_WEBHOOK_ID` 是否与控制台一致。 |
| 试用未生效 | 检查对应产品/计划的 Trial Days 是否设为 1；必要时重新激活订阅。 |
| PAYG 未扣款 | Creem：确认 Webhook 触发；PayPal：确认单次订单已 `APPROVED` 并捕获；Stripe：默认随月账单结算。 |

如需更详细的支付回调映射，可在 `apps/api/app/services/*_service.py` 内查看实现并按需扩展。欢迎在 PRD 中补充更细粒度的支付策略。 
