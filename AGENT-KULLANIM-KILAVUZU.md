# Agent Kullanım Kılavuzu

Bu belge, Boss'un kişisel Hermes Desktop fork'unda çalışacak sonraki agentlar içindir.
Son doğrulanan durum: 12 Ekim 2026. Yeni işe başlarken dosyaları ve branch durumunu yeniden kontrol et.

## 1. Projenin amacı

Bir ekranda 4–5 **gerçek Hermes session'ını** aynı anda kullanmak.
Her session, aynı canvas içindeki diğer session pencereleriyle alanı paylaşan bir pencerede açılır.
Her pencere kendi geçmişini, taslağını, model seçimini ve mesaj gönderme alanını korur.

Sadece tema, statik HTML, iframe içindeki sahte sohbet veya session değiştiren tek panel bu ihtiyacı karşılamaz.
Kullanıcının kabul ettiği tasarımı baştan değiştirme. İstenen değişikliği mevcut yerleşim üzerinde uygula.
Tasarım tercihleri: okunabilir büyük yazılar, sakin krem tonları, kullanıcı mesajı sağda,
Hermes mesajı solda, Messaging altında Kanban. Gereksiz üst karşılama bloğu çalışma alanını kaplamamalı.

## 2. Repo ve çalışma dalı

- Fork: https://github.com/wegvon/hermes-agent
- Upstream: https://github.com/NousResearch/hermes-agent
- Özel geliştirme dalı: `boss/session-windows`
- İlk özelleştirme commit'i: `5102be8259cf993d7a6ca66ac44a28bd758bfb22`
- Özelleştirmenin upstream tabanı: `5d5e763780661340aa69caaff019d9079db7d270`
- `main` upstream takibi içindir. Özel değişiklikler çalışma dalındadır.

Önce root ve ilgili alt dizinlerin `AGENTS.md` dosyalarını oku.
Bu kılavuz mevcut geliştirme kurallarının yerine geçmez.
`SESSION-WORKSPACE.md` kısa teknik özettir.

Yeni, temiz checkout için:

```sh
git clone --branch boss/session-windows https://github.com/wegvon/hermes-agent.git
cd hermes-agent
git remote add upstream https://github.com/NousResearch/hermes-agent.git
git status --short --branch
```

Mevcut checkout'ta önce `git remote -v` ve `git status` kontrol et.
Var olan remote'u körlemesine değiştirme, kullanıcının değişikliklerini silme.

## 3. Kod haritası

| Dosya | Sorumluluk |
|---|---|
| `apps/desktop/src/app/contrib/wiring.tsx` | Sidebar session açma ve yeni session eylemlerini canvas modunda ek pencereye yönlendirir. |
| `apps/desktop/src/components/pane-shell/tree/renderer/tree-group.tsx` | Gerçek session katkılarını pencere içinde gösterir, görünür session'ların yaşam döngüsünü korur ve araç çubuğunu bağlar. |
| `apps/desktop/src/components/pane-shell/tree/renderer/session-window.tsx` | Sürükleme, sekiz kenar/köşe tutamacı, büyütme, geri alma, kapatma ve klavye hareketleri. |
| `apps/desktop/src/components/pane-shell/tree/renderer/session-canvas-state.ts` | Canvas modu, yerleştirme sinyali, sınırlandırma ve otomatik düzen geometrisi. |
| `apps/desktop/src/components/pane-shell/tree/renderer/session-canvas.test.tsx` | Çoklu görünür session, bileşen kimliği/taslak korunması, sürükleme ve resize regresyonları. |

Backend değiştirilmedi. Var olan native session routing, contribution, composer ve backend bağlantısı kullanılıyor.
Session içeriğini pointer hareketinde yeniden mount etme.
Pencere odağı doğru session'ı aktifleştirmeli. Mesaj başka session'a gitmemeli.
Görünür pencereleri pasif sekme gibi park ederek durdurma.
Kanban gibi tam sayfa araçların mevcut davranışını koru.

## 4. Arayüzün kullanımı

- Pencereler modu: Birden fazla session aynı çalışma alanında görünür.
- Sidebar'dan session aç: Mevcut native session ek pencere olarak açılır.
- + Yeni session: Yeni bir gerçek session penceresi açar.
- Başlığı başka pencerenin üzerine sürükleyip bırak: iki session yer değiştirir. Kenar/köşeleri çek: ortak satır/sütun sınırları değişir, pencereler çakışmaz.
- Düzenle: Pencereleri çalışma alanına yeniden dizer.
- Büyüt/geri al: Session için daha fazla alan ayırır, diğerleri görünür kalır. Tekrar basınca önceki oranlara döner.
- Sekmeler: Mevcut sekmeli görünüme döner.
- Pencere başlığındaki klavye kontrolü: oklar taşır, Shift + oklar boyutlandırır.

## 5. Yerel prototip ve çalışan uygulama

İlk geliştirme çalışma klasöründe şu göreli yollar kullanıldı. Başka makinede mevcut olduklarını varsayma:

- `hermes-session-workspace/`: Seçilmiş kaynak dizinlerinin çalışma kopyası.
  İlk oluşturulduğunda tam git clone değildi ve bağımlılık symlink'leri kullanıyordu.
- `outputs/Hermes-Workspace.app`: macOS'ta açılıp dört gerçek session ile doğrulanan özel uygulama.
- `outputs/hermes-live-workspace/app/`: Resmi uygulama runtime'ı ve özel renderer birleşimi.
- `outputs/hermes-live-workspace/source/`, `session-windows.patch`, `source-hashes.json`: İlk kaynak yedeği.
- `outputs/hermes-design-lab.html`: Görsel prototip. Gerçek session uygulaması değildir.
- `outputs/boss-design-lab/`: Ayrı tema/önizleme plugin'i.

Bu fork commit'i native session kaynaklarını içerir. Yerel tema plugin'i, kullanıcı ayarları ve uygulama
binary'si bu commit ile taşınmış değildir. Yeni makinede aynı görünümün kendiliğinden kurulacağını söyleme.
Kanban mevcut Hermes özelliğidir. Tema ve sidebar tercihleri ayrı plugin/ayar katmanındadır.

İlk ZIP'teki README ve shell launcher daha eski denemenin durumunu yansıtabilir.
Başarılı GUI doğrulaması daha sonra `Hermes-Workspace.app` ile yapıldı.
Shell'den Electron başlatma sandbox altında abort 134 verdi. Bunu doğrudan kaynak kod hatası sayma.
Yeni checkout'ta upstream'in belgelenmiş build yolunu kullan. Eski renderer'ı farklı sürüm runtime'ına
uyumluluğunu kontrol etmeden kopyalama.

## 6. Geliştirme ve doğrulama

Node/npm sürüm sınırları ve komutlar için güncel root ve Desktop `package.json` dosyalarını oku.
Bağımlılık kurulumunu repo kökünden upstream talimatlarına göre yap.
Testler için ayrı kullanıcı/veri ortamı kullan. Gerçek session verisini test fixture'ı yapma.

Desktop dizininde hedefli kontroller:

```sh
cd apps/desktop
npx vitest run --project ui session-canvas.test.tsx session-tile-actions.test.ts session-tile-attachments.test.tsx
npx tsc -p tsconfig.json --noEmit
npx vite build
```

Bunlar renderer kontrolleridir, tam Electron paketlemesinin yerine geçmez.
Mevcut package script'leri: `npm run dev`, `npm run build`, `npm run pack`.
Tam build ve paketleme ihtiyaçlarını güncel Desktop dokümantasyonundan doğrula.

12 Ekim'de doğrulananlar:

- Üç hedefli dosyada toplam 15 test geçti.
- Renderer TypeScript kontrolü ve Vite production build geçti.
- Özel macOS uygulaması açıldı, backend ready oldu ve dört farklı gerçek session aynı anda gösterildi.
- Otomatik pointer drag/resize testleri taslak ve bileşen kimliğini korudu.

Henüz doğrulanmayanlar: Birden fazla pencereden canlı modele eşzamanlı mesaj gönderimi,
imzalı dağıtım paketi ve otomatik güncelleme.
Bunlar yapılmış gibi raporlama.

Davranış değişikliği sonrası kontrol et: 4–5 session açılması, doğru geçmiş/model/composer,
taslağın drag/resize sırasında korunması, sınır dışına taşmama, odak, kapatma, büyüt/geri al,
Sekmeler/Pencereler geçişi ve Kanban'a girip geri dönme.
Model çağrısı maliyetli veya dış etkili olabilir. Kullanıcının yetkisi kapsamında test et.

## 7. Güncellemeler ve geri dönüş

Fork kaynak kodu korur. Kurulu uygulamanın resmi updater tarafından değiştirilmesini tek başına engellemez.
Özel otomatik update veya release pipeline henüz yoktur.

1. Çalışma ağacını kontrol et, mevcut özel commit'i geri dönüş noktası olarak kaydet.
2. `git fetch upstream` ile yeni commit'leri al.
3. `boss/session-windows` dalından ayrı bir entegrasyon dalı aç.
4. Upstream `main` değişikliklerini bu dala merge et, çatışmaları mevcut davranışı koruyarak çöz.
5. Özellikle wiring, tree-group, session lifecycle ve upstream API değişikliklerini incele.
6. Hedefli test, typecheck ve build çalıştır. Yeni uygulamayı ayrı konumda açıp gerçek pencere davranışını doğrula.
7. Doğrulanan sonucu özel çalışma dalına taşı, commit ve uygulama sürümü eşleşmesini kaydet.

Upstream dosyalarının tamamını eski yerel kopyayla değiştirerek yeni düzeltmeleri geri alma.
Paylaşılmış branch'i izinsiz force-push etme.
Geri dönüşte önceki çalışan uygulama/commit'i kullan. Session veritabanını veya ayarları silme.
Resmi updater'ın özel uygulamaya etkisi incelenmeden “güncellemede kesin korunur” deme.

## 8. Bilinen sınırlar ve sonraki işler

- Pencere koordinatları ve boyutları uygulama yeniden açılınca kalıcı değil.
- Canvas modu pencere-yerel state kullanıyor.
- Pencereler mevcut pane group içinde düzenleniyor. Ayrı layout grupları tek global canvas'a dönüşmüyor.
- Pane park edilip yeniden mount edilirse geometri sıfırlanabilir.
- Türkçe eklenen kontrol metinlerinin upstream i18n sistemine taşınması ileride değerlendirilebilir.
- Tekrarlanabilir paketleme, ayrı uygulama kimliği ve kontrollü update/release akışı henüz kurulmadı.
- Tema plugin'inin kaynaklarını sürümlemek ve temiz kurulum rehberi ayrı takip işi.

Yeni bir agent önce kullanıcının sıradaki hedefini uygulasın. Bu liste tüm işleri otomatik yapma talimatı değildir.

## 9. Handoff disiplini

Her anlamlı değişiklik sonunda bu kılavuzun durumunu güncelle.
Commit, test sonucu, çalışan uygulama yolu ve kalan sınırlamaları kısa ve doğru yaz.
Kaynak değişikliği, derlenmiş uygulama ve ekrandaki çalışan sürümün aynı şey olduğunu varsayma.
Secret, API key, session geçmişi, kullanıcı veritabanı, log ve kişisel ayarları public repo'ya ekleme.

## 10. Günlük kullanım kurulumu, 12 Ekim 2026

- Aktif kurulum: `/Applications/Hermes Workspace.app`.
- Uygulama kimliği: `com.wegvon.hermes.workspace`. Menü/Dock adı: Hermes Workspace.
- Eski `/Applications/Hermes.app` Finder ile Çöp Sepeti'ne taşındı. Çöp Sepeti boşaltılmadı.
- Önceki çalışma klasörü uygulaması kapatıldı. Yeni kurulum açıldı, backend ready ve mevcut session/model/tema durumu görüldü.
- Mevcut Hermes veri ve backend kurulumu korundu. Bu uygulama bağımsız yeni bir backend kurulumu değildir.
- Paketleme tarifi: `scripts/fork/package-workspace.py`. Girdi, özel renderer'ı zaten içeren doğrulanmış macOS app bundle'ıdır. Script kaynak derlemesi yapmaz.
- Paketleme script'i bundle adını/kimliğini/ikonunu ayarlar, paketlenmiş main dosyasındaki uygulama güncelleme kontrolünü desteklenmiyor olarak döndürür ve uygulama güncelleme uygulama girişini hata ile durdurur. Sonra JS syntax ve ad-hoc imzayı doğrular.
- Bu engel Desktop'ın yerel uygulama güncelleme girişleri içindir. Terminalden backend güncellemesi veya başka kurulum araçları için genel bir engel değildir.
- Paketleme uyarlaması Electron main kaynak dosyasına henüz taşınmadı. Sonraki build'de bu script uygulanmadan aynı korumanın var olduğunu varsayma. Upstream runtime değişirse script'in eşleşme kontrolü başarısız olur ve inceleme gerekir.
- Yerel imza kontrolü geçti. Apple noter onaylı dağıtım veya otomatik fork güncelleyicisi kurulmuş değildir.
- Geri dönüş gerekirse önceki uygulama Çöp Sepeti'nden geri alınabilir. Kullanıcı verisini silme.

Bu bölüm, yukarıdaki ilk prototip/kurulum durumunun güncel devamıdır.

## 11. Çakışmasız session yerleşimi, 12 Ekim 2026

`session-tile-layout.ts` canvas başına ortak yerleşim state sahibi oldu. Frame bileşenleri yalnız bu küçük store’u dinler. Başlık sürükleme bırakıldığında slot değiştirir. Resize komşu satır/sütunların payını değiştirir. Son satırdaki boş hücreler son session tarafından doldurulur. Büyütme diğer session’ları örtmez, alan oranlarını değiştirir. Pencere ekleme/çıkarma eşit dağılımı yeniden kurar. Geometri halen yeniden açılışta kalıcı değildir.

Dört hedefli test dosyasında 16 test, renderer TypeScript kontrolü ve production build geçti. `session-tile-layout.test.ts` beş session için sınır, çakışmama, resize, yer değiştirme, büyüt/geri al ve küçük viewport davranışını kontrol eder. DOM testinde taşınan/boyutlanan chat bileşeni ve taslağı korunur. Başlıkta ok tuşları slot değiştirir, Shift+ok ortak alt/sağ sınırı ayarlar. Canvas dış kenarı büyütülemez. Yeni renderer mevcut özel runtime üzerine paketlenir, resmi updater engeli korunur.
