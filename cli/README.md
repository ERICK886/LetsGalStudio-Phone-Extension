# create-phone-app

> 鍖呭悕锛歚@ink-zenly/create-phone-app`  
> 鐢ㄩ€旓細鑴氭墜鏋剁敓鎴?LetsGal 鎵嬫満瀹夸富鎵╁睍涓庡唴椤靛簲鐢紙Phone SDK plugin锛?

鏈?CLI 鎻愪緵涓夋潯璺緞锛?

| 鍛戒护 | 鍦烘櫙 |
|------|------|
| `create` | 鐢熸垚**鎵嬫満瀹夸富**鎵╁睍宸ョ▼锛堝惈棣栦釜鍐呴〉锛屽彲鏈湴寮€鍙戣皟璇曪級 |
| `add` | 鍦?*宸叉湁瀹夸富** `src/<app-id>/` 娣诲姞鍐呴〉锛屽苟鑷姩娉ㄥ叆 `src/index.tsx` 娉ㄥ唽琛?|
| `pack` | 灏嗗涓诲唴 `src/<app-id>/` **鎶界**涓?`release/` 鏍囧噯鍐呴〉鍖咃紙鍙崟鐙垎鍙戯級 |

鍙傝€冨疄鐜帮細鏈粨 `src/demo-shop/`锛堝唴椤电ず渚嬶級+ 鏍?`src/index.tsx`锛堝涓绘敞鍐屽叆鍙ｏ級銆?

---

## 瀹夎 / 璋冪敤

### 鏈粨搴擄紙鎺ㄨ崘寮€鍙戞椂锛?

鍦ㄦ墿灞曟牴鐩綍锛?

```powershell
pnpm create-phone-app --help
pnpm create-phone-app create --help
pnpm create-phone-app add --help
pnpm create-phone-app pack --help
```

鏍?`package.json` 宸叉彁渚?script锛歚create-phone-app` 鈫?`node ./cli/bin/create-phone-app.js`銆?

### 鏃犲弬鍚戝

涓嶄紶瀛愬懡浠ゆ椂杩涘叆浜や簰锛屽彲閫夋嫨 `create` 鎴?`add`锛?

```powershell
pnpm create-phone-app
```

### 宸插彂甯冨寘

```powershell
pnpm dlx @ink-zenly/create-phone-app@0.3.5 create .\my-host `
  --template default `
  --extension-id com.acme.my-phone `
  --app-id my-shop `
  --title "鎴戠殑鍟嗗簵"
```

鏈粨寮€鍙戜粛鎺ㄨ崘锛歚pnpm create-phone-app`銆?

**涓ゅ眰 ID锛堝嬁娣锋穯锛夛細**

| ID | 鍚箟 | 鍐欏叆浣嶇疆 |
|----|------|----------|
| `--extension-id` | 瀹夸富鎵╁睍鍖?id | `extension.json.id`銆乂ite `__PHONE_HOST_EXTENSION_ID__`銆乣package.json` name |
| `--app-id` | 棣栦釜鍐呴〉绋嬪簭 id | `src/<app-id>/`銆乣registerPhoneApp({ id })` |

浜岃€呭潎鐢辩敤鎴锋寚瀹氾紱**涓嶄細**鍐嶈嚜鍔ㄧ敓鎴?`ink.zenly.phone-app-*`銆?

---

## `create`锛氭墜鏈哄涓绘墿灞?

鍦ㄧ洰鏍囩洰褰曠敓鎴?*瀹夸富** Vite + TypeScript 鎵╁睍楠ㄦ灦锛氬叆鍙?`src/index.tsx` 瀵煎嚭 `PhoneExtension` 骞舵敞鍐岄涓唴椤?`src/<app-id>/`銆備緷璧?`@ink-zenly/phone-sdk` 鐨?**npm 鐗堟湰**锛堝綋鍓?`inkZenly.phoneSdkVersion` 涓?`^0.5.0`锛夛紝鎹嗙粦 `@avg-studio/sdk` 浜?`./sdk`銆俙create` 瀹夸富妯℃澘鐨?`vite.config.ts` 宸蹭粠 `extension.json` 娉ㄥ叆 `__PHONE_HOST_EXTENSION_ID__`銆?

```powershell
pnpm create-phone-app create .\my-host --template default `
  --extension-id com.acme.my-phone --app-id my-shop --title "鎴戠殑鍟嗗簵"
pnpm create-phone-app create .\tiny --template minimal `
  --extension-id tiny-host --app-id tiny --title 绮剧畝 --force
```

| 閫夐」 | 璇存槑 |
|------|------|
| `[dir]` | 鐩爣鐩綍锛堝彲缂虹渷锛屼氦浜掕闂紱榛樿 `./<extension-id>`锛?|
| `--template` | `default`锛堝畬鏁?README锛夋垨 `minimal`锛堟渶灏忥級 |
| `--extension-id` | 瀹夸富鎵╁睍鍖?id锛岄』鍖归厤 `^[a-z][a-z0-9.-]*$`锛堝彲鍚偣鍙凤級 |
| `--app-id` | 棣栦釜鍐呴〉绋嬪簭 ID锛岄』鍖归厤 `^[a-z][a-z0-9-]*$` |
| `--title` | 鏄剧ず鏍囬 |
| `--force` | 鍏佽鍐欏叆闈炵┖鐩綍 |

鐢熸垚鍚庯紙瀹夸富寮€鍙戯級锛?

```powershell
cd <dir>
pnpm install
pnpm watch
# 鎴?pnpm build
```

**鍒嗗彂鍐呴〉**璇蜂娇鐢?`pack`锛堣涓嬶級锛屼骇鐗╁湪 `./release/`锛屽涓?`.gitignore` 宸插拷鐣?`release/`銆?

### 妯℃澘璇存槑

| 妯℃澘 | 鐩綍 | 鍐呭 |
|------|------|------|
| `default` | `cli/templates/create-host-default/` | 瀹屾暣瀹夸富鑴氭墜鏋?+ 璇︾粏 README |
| `minimal` | `cli/templates/create-host-minimal/` | 鍚屼笂锛孯EADME 鏇寸煭 |

涓よ€呭潎鍚細`package.json`銆乣extension.json`銆乣vite.config.ts`銆乣src/index.tsx`銆佹崋缁?`sdk/`锛涢涓唴椤垫潵鑷?`cli/templates/add/`銆?

---

## `pack`锛氭娊绂绘爣鍑嗗唴椤靛寘

鍦ㄥ涓讳粨搴撴牴锛堝惈 `definePhonePluginRegistry` 鐨?`src/index.tsx`锛変笅锛屽皢 `src/<app-id>/` 娓叉煋涓?**鏍囧噯鍐呴〉鎵╁睍** 鍒?`release/`锛堥粯璁わ級锛屽苟鑷姩鎵ц `pnpm install && pnpm build`銆?

```powershell
pnpm create-phone-app pack demo-shop
pnpm create-phone-app pack demo-shop --force
pnpm create-phone-app pack demo-shop --out ./release --title "婕旂ず鍟嗗簵"
pnpm create-phone-app pack demo-shop --extension-id com.acme.demo-shop-ext
```

| 閫夐」 | 璇存槑 |
|------|------|
| `[app-id]` | 绋嬪簭 ID锛堝彲缂虹渷锛涗氦浜掔粓绔笅鍒楀嚭 `src/*/index.tsx` 渚涢€夋嫨锛?|
| `--cwd` | 鍚戜笂鏌ユ壘瀹夸富鏍圭殑璧峰鐩綍锛堥粯璁?`process.cwd()`锛?|
| `--out` | 杈撳嚭鐩綍锛岄粯璁?`release`锛堢浉瀵瑰涓绘牴鎴栫粷瀵硅矾寰勶級 |
| `--force` | 鍏佽鍐欏叆闈炵┖鐩爣鐩綍 |
| `--title` | 鎵╁睍鏄剧ず鏍囬锛堥粯璁や笌 app-id 鐩稿悓锛?|
| `--extension-id` | 鍐呴〉鍖?`extension.json.id`锛?*榛樿绛変簬 app-id**锛涘彲涓?app-id 涓嶅悓锛?|

浜х墿鐗圭偣锛?

- 鍏ュ彛 `dist/index.mjs`锛?*涓嶅惈**鎵嬫満瀹夸富锛坄PhoneExtension`锛?
- **涓嶅惈** `phone-sdk/`銆乣scripts/`銆乣docs/`銆乣dev-host*`銆乣extension.dev.json`銆乣dist-dev/`
- 鍒嗗彂鏃堕渶鍚屾椂鍚敤鎵嬫満瀹夸富鎵╁睍锛屽涓?`phoneAppId` 椤讳笌鍐呴〉 **app-id** 涓€鑷达紙涓嶆槸 extension-id锛岄櫎闈炰簩鑰呯浉鍚岋級

闈炰氦浜掔幆澧冿紙CI / 绠￠亾锛夋湭浼?app-id 鏃朵細鎶ラ敊銆岃鎸囧畾 app-id銆嶃€?

---

## `add`锛氭湰浠撳唴椤?

鍦ㄥ涓讳粨搴撴牴涓嬪垱寤?`src/<app-id>/`锛屽苟娉ㄥ叆锛?

- `import { registerXxxPhoneApp } from "./<app-id>"`
- 灏?`registerXxxPhoneApp` 鍔犲叆 `definePhonePluginRegistry(...)`

娉ㄥ唽鍑芥暟鍚嶈鍒欙細`register` + PascalCase(appId) + `PhoneApp`  
锛堜緥锛歚demo-shop` 鈫?`registerDemoShopPhoneApp`锛?

```powershell
pnpm create-phone-app add notes --title "渚跨"
pnpm create-phone-app add notes --title "渚跨" --force
```

| 閫夐」 | 璇存槑 |
|------|------|
| `[app-id]` | 绋嬪簭 ID锛坘ebab-case锛?|
| `--title` | 鏄剧ず鏍囬 |
| `--cwd` | 鍚戜笂鏌ユ壘瀹夸富鏍圭殑璧峰鐩綍锛堥粯璁?`process.cwd()`锛?|
| `--force` | 鍏佽瑕嗙洊宸插瓨鍦ㄧ殑 `src/<app-id>/` |

妯℃澘鏉ユ簮锛歚cli/templates/add/`锛坄index.tsx` + `app.tsx`锛夈€?

娣诲姞鍚庤鎵ц `pnpm build`锛屽苟鍦?Studio 涓厤缃€屽姩浣?路 鎵嬫満鍐呴儴搴旂敤銆嶇粦瀹氬悓涓€ `app-id`銆?

---

## app-id 瑙勫垯

鍚堟硶锛歚^[a-z][a-z0-9-]*$`锛堝皬鍐欏瓧姣嶅紑澶达紝浠呭皬鍐欏瓧姣?/ 鏁板瓧 / 杩炲瓧绗︼級銆?

闈炴硶绀轰緥锛歚Bad_Id`銆乣123shop`銆乣MyApp`銆?

宸叉彁渚?`app-id`锛堝惈浣嶇疆鍙傛暟锛夋椂浼氬湪杩涘叆浜や簰鍓嶆牎楠岋紱闈炴硶鍊肩珛鍗宠緭鍑轰腑鏂囬敊璇苟浠ラ潪闆堕€€鍑恒€備粎 app-id 鍚堟硶涓旂己灏?`--title` 鏃舵墠浼氳繘鍏ユ爣棰樹氦浜掋€?

---

## 涓?`demo-shop` / phone-sdk 鐨勫叧绯?

- **`src/demo-shop/`**锛氭湰浠撴墜鍐欏弬鑰冨唴椤碉紱`add` / `create` 鐢熸垚鐨勫唴椤电粨鏋勪笌涔嬪榻愩€?
- **`@ink-zenly/phone-sdk`**锛氬涓讳笌鍐呴〉 API锛汣LI 閫氳繃璇诲彇鏈粨 `phone-sdk/package.json` 鐨?`version`锛屽湪妯℃澘 `package.json` 涓啓鍏?`^<version>`銆?
- **绂佹**鑴氭墜鏋堕粯璁よ緭鍑?`file:../phone-sdk`锛涜仈璋冩椂鍙湰鍦版敼渚濊禆锛屽嬁鏀?CLI 榛樿琛屼负銆?
- **`pack`** 浼氬湪 release 鐩綍鑷姩 `pnpm install` + `pnpm build`锛?*create / add** 棣栫増涓嶈嚜鍔?install銆?

---

## 寮€鍙戜笌娴嬭瘯锛堢淮鎶よ€咃級

```powershell
cd cli
node --import tsx --test src/**/*.test.ts
```

宸ュ叿鍗曟祴瑕嗙洊锛氭牎楠屻€佸懡鍚嶃€佹ā鏉挎嫹璐濄€佹敞鍐岃〃娉ㄥ叆銆佸涓绘牴鏌ユ壘銆乸ack 璺緞鏍￠獙绛夈€?

