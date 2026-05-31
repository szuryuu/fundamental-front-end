const { execSync } = require("child_process");

const templates = {
  passAll: `Selamat! Kamu telah berhasil menyelesaikan submission ini dengan sangat baik. Logika JavaScript yang kamu tulis sudah solid dan memenuhi standar kelulusan. Jadikan ilmu dari proyek ini sebagai fondasi untuk tantangan yang lebih kompleks di depan. Tetap semangat!\n\nSebagai saran pengembangan (optional): Beberapa tombol aksi seperti "Delete" dan "Edit" bisa kamu transformasikan menjadi ikon menggunakan library seperti FontAwesome atau Google Material Icons agar UI terlihat lebih bersih dan modern.\n\nKe depannya, cobalah untuk menerapkan konsep Separation of Concerns (SoC). Pisahkan fungsi yang mengurus data murni (Local Storage & Array) dari fungsi yang mengurus antarmuka (DOM Manipulation). Walaupun saat ini semuanya ditulis dalam satu berkas, memisahkan tanggung jawab fungsi akan membuat kodemu jauh lebih mudah dipelihara saat skala aplikasi semakin besar.`,
  rejectTestId: `Setiap kartu transaksi yang dirender melalui JavaScript wajib memiliki atribut data-testid sesuai struktur starter project. Saat ini, sistem penguji otomatis tidak dapat mendeteksi elemen transaksi karena ketiadaan atau perubahan nilai atribut tersebut.\n\nKartu transaksi kamu harus dirender secara dinamis dengan struktur berikut:\n<div data-testid="transactionItem">\n  <h3 data-testid="transactionItemTitle">Judul Transaksi</h3>\n  <p data-testid="transactionItemAmount">Nominal: Rp10000</p>\n  <p data-testid="transactionItemDate">Tanggal: 2030-12-01</p>\n  <p data-testid="transactionItemType">Tipe: Pemasukan</p>\n  <div>\n    <button data-testid="transactionItemEditTypeButton">Ubah Tipe</button>\n    <button data-testid="transactionItemDeleteButton">Hapus</button>\n  </div>\n</div>\n\nKamu bebas menambahkan class atau id ekstra untuk styling, tetapi nilai data-testid mutlak tidak boleh dihapus atau dimodifikasi. Pastikan logikamu merender persis seperti kerangka di atas.`,
  rejectGreeting: `Teks sapaan bawaan pada header aplikasi belum diubah. Sesuai instruksi mutlak pada modul, kamu wajib mengubah teks "Siswa Front-End" yang berada di dalam elemen .tracker-header__greeting menjadi Nama Lengkap dan Username Dicoding kamu (contoh: Budi (bdi002)).`,
  rejectLocalStorage: `Sistem mendeteksi bahwa seluruh data transaksi hilang ketika halaman dimuat ulang (refresh). Sesuai dengan kriteria penilaian, ini berarti Web Storage API (localStorage) belum diimplementasikan atau tidak bekerja dengan benar. \n\nAplikasi pengelola keuangan mutlak harus bisa mempertahankan data secara persisten di browser. Pastikan kamu menggunakan localStorage.setItem() untuk menyimpan seluruh array transaksi, dan localStorage.getItem() di awal kodemu untuk memuat kembali data tersebut ke layar saat aplikasi dijalankan.`,
  c1Basic: `Aplikasi kamu belum berhasil menampilkan daftar transaksi ke layar. Pastikan objek transaksi dipisahkan ke dalam elemen penampung yang tepat: incomeList untuk pemasukan dan expenseList untuk pengeluaran. Gunakan metode document.createElement() untuk merakit elemen, jangan menggunakan manipulasi string innerHTML +=.`,
  c1Skilled: `Formulir transaksi belum memiliki sistem validasi yang menahan input kosong/tidak valid. Pastikan form menampilkan peringatan (contoh: via alert() atau validasi bawaan HTML5 required/min) dan mencegah data tersimpan jika judul kosong atau nominal uang kurang dari Rp 1.`,
  c1Advanced: `Daftar transaksimu sudah muncul, tetapi panel ringkasan keuangan (Total Saldo, Pemasukan, Pengeluaran) tidak merespons perubahan data. Pastikan teks pada panel tersebut dihitung ulang secara matematis dan diperbarui seketika (real-time) setiap kali ada penambahan, perubahan, atau penghapusan transaksi.`,
  c2Basic: `Data aplikasimu masih menguap/hilang ketika halaman di-refresh. Pastikan kamu memanggil localStorage.setItem dengan JSON.stringify() saat menyimpan data, dan memuatnya kembali saat halaman dibuka. Selain itu, pastikan fitur "Hapus" benar-benar menghapus data tersebut dari array utama sekaligus dari memori localStorage.`,
  c2Skilled: `Alur fitur "Edit" belum tuntas. Saat tombol edit ditekan, formulir masukan wajib terisi otomatis dengan data transaksi yang dipilih. Setelah pengguna menekan simpan, perubahan tersebut harus diperbarui di memori, dan formulir harus kembali dikosongkan ke mode "Tambah Transaksi".`,
  c2Advanced: `Untuk mendapatkan nilai sempurna di manajemen data, arsitektur pembaruan layarmu harus menggunakan Custom Event. Saat ada data yang berubah (tambah/edit/hapus), lepaskan sebuah sinyal menggunakan document.dispatchEvent(). Kemudian, pasang satu event listener sentral yang bertugas mendengarkan sinyal tersebut untuk memicu fungsi render ulang layar dan perhitungan dashboard.`,
  c3Basic: `Tombol "Ubah Tipe" pada transaksimu belum beroperasi dengan benar. Tombol ini harus mampu membalikkan tipe transaksi pada objek (misal: "income" menjadi "expense") lalu memastikan elemennya berpindah dari daftar pemasukan ke pengeluaran (atau sebaliknya).`,
  c3Skilled: `Fitur pencarianmu belum memenuhi kriteria "real-time" atau justru merusak layar. Pastikan kamu menggunakan event input (bukan submit atau sekadar click) agar daftar transaksi tersaring seketika saat pengguna mengetik. Jika fitur pencarian dibungkus tag <form>, pastikan kamu menambahkan e.preventDefault() agar halaman tidak mengalami reload yang merusak data state.`,
  c3Advanced: `Logika pencarianmu terjebak saat form kembali kosong. Pastikan kamu menambahkan pengondisian: jika kata kunci pencarian kosong (panjang string = 0), aplikasi harus otomatis merender ulang seluruh isi array transactions secara utuh ke layar tanpa perlu refresh.`,
};

const shortTemplates = {
  passAll: "Semua kriteria lulus. Berikan saran SoC dan icon font.",
  rejectTestId:
    "Atribut data-testid wajib sesuai kerangka HTML di starter project dan tidak boleh diubah/dihapus.",
  rejectGreeting:
    "Ubah teks 'Siswa Front-End' di HTML menjadi Nama dan Username Dicoding kamu.",
  rejectLocalStorage:
    "Data hilang saat refresh. Gunakan localStorage setItem dan getItem untuk menyimpan array.",
  c1Basic:
    "Gunakan document.createElement() untuk merender objek ke kontainer incomeList/expenseList.",
  c1Skilled:
    "Tambahkan validasi (alert/HTML5) untuk memblokir form jika judul kosong atau nominal < Rp1.",
  c1Advanced:
    "Panel Saldo, Pemasukan, dan Pengeluaran harus otomatis terhitung ulang saat data transaksi berubah.",
  c2Basic:
    "Gunakan localStorage.setItem/getItem dan pastikan tombol Hapus turut menghapus data dari memori.",
  c2Skilled:
    "Tombol Edit harus mengisi form otomatis, menyimpan perubahan, lalu mereset form kembali.",
  c2Advanced:
    "Gunakan document.dispatchEvent() untuk memicu render ulang UI secara terpusat.",
  c3Basic:
    "Tombol Ubah Tipe harus membalikkan tipe (income/expense) pada objek dan layarnya.",
  c3Skilled:
    "Gunakan event 'input' pada kolom pencarian agar real-time dan beri e.preventDefault() agar tidak reload.",
  c3Advanced:
    "Render kembali seluruh daftar transaksi secara otomatis saat kata kunci pencarian dikosongkan.",
};

function copyToClipboard(text) {
  if (process.platform === "win32") {
    try {
      execSync("clip", { input: text, timeout: 2000 });
      return true;
    } catch (e) {
      return false;
    }
  } else if (process.platform === "darwin") {
    try {
      execSync("pbcopy", { input: text, timeout: 2000 });
      return true;
    } catch (e) {
      return false;
    }
  } else {
    const linuxCommands = [
      "wl-copy",
      "xclip -selection clipboard",
      "xsel --clipboard --input",
      "cliphist store",
    ];

    for (const cmd of linuxCommands) {
      try {
        execSync(cmd, { input: text, timeout: 2000, stdio: "ignore" });
        return true;
      } catch (err) {
        continue;
      }
    }
    return false;
  }
}

function generateFeedback(report) {
  let feedbackBlocks = [];
  let cliHints = [];

  if (report.rejected.length > 0) {
    feedbackBlocks.push(
      "Halo! Terima kasih telah mengirimkan submission kamu. Logika kode yang kamu buat sudah sangat baik, namun submission ini harus dikembalikan (Reject) karena belum memenuhi beberapa kriteria wajib berikut:\n",
    );

    let hasTestIdReject = report.rejected.some((r) =>
      r.includes("data-testid"),
    );
    let hasGreetingReject = report.rejected.some((r) =>
      r.includes("Siswa Front-End"),
    );
    let hasLocalStorageReject = report.rejected.some((r) =>
      r.includes("localStorage belum digunakan"),
    );

    if (hasTestIdReject) {
      feedbackBlocks.push(templates.rejectTestId);
      cliHints.push(`[Reject] ${shortTemplates.rejectTestId}`);
    }
    if (hasGreetingReject) {
      feedbackBlocks.push(templates.rejectGreeting);
      cliHints.push(`[Reject] ${shortTemplates.rejectGreeting}`);
    }
    if (hasLocalStorageReject) {
      feedbackBlocks.push(templates.rejectLocalStorage);
      cliHints.push(`[Reject] ${shortTemplates.rejectLocalStorage}`);
    }

    feedbackBlocks.push(
      "\nSilakan perbaiki bagian tersebut dan kirimkan kembali submission kamu. Tetap semangat!",
    );
  } else {
    const failedCriteria = [];
    for (const [criteria, passed] of Object.entries(report.mandatory)) {
      if (!passed) failedCriteria.push(criteria);
    }

    if (failedCriteria.length === 0) {
      feedbackBlocks.push(templates.passAll);
      cliHints.push(`[Pass] ${shortTemplates.passAll}`);
    } else {
      feedbackBlocks.push(
        "Halo! Kerja yang bagus sejauh ini. Aplikasi kamu sudah berjalan, namun masih ada beberapa perbaikan yang perlu dilakukan agar memenuhi seluruh spesifikasi kriteria kelulusan Dicoding:\n",
      );

      if (failedCriteria.includes("Criteria 1 Basic: Render DOM & Lists")) {
        feedbackBlocks.push("- " + templates.c1Basic);
        cliHints.push(`[C1-Basic] ${shortTemplates.c1Basic}`);
      }
      if (failedCriteria.includes("Criteria 1 Skilled: Input Validation")) {
        feedbackBlocks.push("- " + templates.c1Skilled);
        cliHints.push(`[C1-Skilled] ${shortTemplates.c1Skilled}`);
      }
      if (failedCriteria.includes("Criteria 1 Advanced: Dynamic Dashboard")) {
        feedbackBlocks.push("- " + templates.c1Advanced);
        cliHints.push(`[C1-Advanced] ${shortTemplates.c1Advanced}`);
      }
      if (failedCriteria.includes("Criteria 2 Basic: LocalStorage & Delete")) {
        feedbackBlocks.push("- " + templates.c2Basic);
        cliHints.push(`[C2-Basic] ${shortTemplates.c2Basic}`);
      }
      if (failedCriteria.includes("Criteria 2 Skilled: Edit Functionality")) {
        feedbackBlocks.push("- " + templates.c2Skilled);
        cliHints.push(`[C2-Skilled] ${shortTemplates.c2Skilled}`);
      }
      if (
        failedCriteria.includes("Criteria 2 Advanced: Custom Event Dispatch")
      ) {
        feedbackBlocks.push("- " + templates.c2Advanced);
        cliHints.push(`[C2-Advanced] ${shortTemplates.c2Advanced}`);
      }
      if (failedCriteria.includes("Criteria 3 Basic: Change Type")) {
        feedbackBlocks.push("- " + templates.c3Basic);
        cliHints.push(`[C3-Basic] ${shortTemplates.c3Basic}`);
      }
      if (failedCriteria.includes("Criteria 3 Skilled: Search Filter")) {
        feedbackBlocks.push("- " + templates.c3Skilled);
        cliHints.push(`[C3-Skilled] ${shortTemplates.c3Skilled}`);
      }
      if (
        failedCriteria.includes("Criteria 3 Advanced: Empty Search Restore")
      ) {
        feedbackBlocks.push("- " + templates.c3Advanced);
        cliHints.push(`[C3-Advanced] ${shortTemplates.c3Advanced}`);
      }

      feedbackBlocks.push(
        "\nSilakan tinjau kembali modul kelas dan sesuaikan logikanya. Saya tunggu submission perbaikannya!",
      );
    }
  }

  const finalFeedback = feedbackBlocks.join("\n\n");
  const isCopied = copyToClipboard(finalFeedback);

  return { finalFeedback, isCopied, cliHints };
}

module.exports = { generateFeedback };
