const { execSync } = require("child_process");

const templates = {
  passAll: `Selamat atas keberhasilanmu menyelesaikan submission ini! Jangan lupa untuk terus belajar dan mengembangkan keterampilanmu. Ilmu yang sudah kamu dapatkan akan menjadi bekal berharga untuk tantangan selanjutnya. Tetap semangat!

Beberapa tombol aksi seperti "Delete" dan sebagainya bisa di transformasikan ke icon agar lebih menarik. Kamu bisa menggunakan library seperti font-awesome atau material-icons sebagai penyedia iconnya.

Untuk pengembangan selanjutnya, kamu dapat mulai menerapkan konsep Separation of Concerns dengan memisahkan logic berdasarkan tanggung jawabnya, misalnya memisahkan operasi Local Storage (menyimpan dan mengambil data) dari operasi UI seperti render elemen atau manipulasi DOM. Meskipun saat ini seluruh kode masih berjalan dalam satu berkas, struktur seperti ini akan lebih mudah dirawat, diuji, dan dikembangkan ketika aplikasi mulai bertambah kompleks.`,

  rejectTestId: `Setiap kartu transaksi yang dibuat melalui JavaScript wajib memiliki atribut data-testid sesuai struktur yang telah ditentukan. Saat ini, sistem penilaian tidak dapat mengenali elemen transaksi dengan benar karena ketiadaan atau perubahan nilai atribut tersebut.

Pastikan setiap kartu transaksi yang dibuat memiliki struktur seperti berikut:
<div data-testid="transactionItem">
  <h3 data-testid="transactionItemTitle">Judul Transaksi</h3>
  <p data-testid="transactionItemAmount">Nominal: Rp10000</p>
  <p data-testid="transactionItemDate">Tanggal: 2030-12-01</p>
  <p data-testid="transactionItemType">Tipe: Pemasukan</p>
  <div>
    <button data-testid="transactionItemEditTypeButton">Ubah Tipe</button>
    <button data-testid="transactionItemDeleteButton">Hapus</button>
  </div>
</div>

Kamu tetap boleh menambahkan class, id, atau atribut lain untuk kebutuhan styling. Namun, nilai data-testid mutlak tidak boleh diubah atau dihapus. Setelah penyesuaian dilakukan, jalankan kembali dan pastikan seluruh transaksi menggunakan struktur tersebut.`,

  rejectGreeting: `Sistem mendeteksi bahwa teks sapaan bawaan pada header belum diubah. Sesuai instruksi submission, pastikan kamu mengubah teks "Siswa Front-End" pada elemen dengan class \`.tracker-header__greeting\` menjadi nama lengkap dan username Dicoding kamu (contoh: Budi (bdi002)).`,

  c1Basic: `Aplikasi kamu belum berhasil merender daftar transaksi ke layar. Pastikan kamu memisahkan objek transaksi ke dalam elemen \`incomeList\` (untuk pemasukan) dan \`expenseList\` (untuk pengeluaran) menggunakan metode manipulasi DOM yang tepat seperti \`document.createElement\`.`,

  c1Skilled: `Aplikasi kamu sudah dapat menambahkan transaksi, namun belum memiliki validasi input yang sesuai. Pastikan form menampilkan peringatan (seperti \`alert()\` atau validasi bawaan HTML5) dan mencegah penyimpanan data jika judul transaksi kosong atau nominal yang dimasukkan kurang dari 1.`,

  c1Advanced: `Daftar transaksi kamu sudah tampil, tetapi panel ringkasan keuangan (Saldo, Pemasukan, Pengeluaran) belum diperbarui secara otomatis. Pastikan nilai pada panel tersebut dihitung ulang secara dinamis setiap kali ada penambahan, perubahan, atau penghapusan transaksi.`,

  c2Basic: `Data transaksi di aplikasimu masih hilang ketika halaman dimuat ulang (refresh) atau tombol Hapus belum berfungsi penuh. Pastikan kamu menggunakan \`localStorage\` dengan \`JSON.stringify()\` untuk menyimpan data, dan \`JSON.parse()\` untuk memuatnya kembali. Tombol hapus juga wajib menghapus data dari array utama sekaligus dari localStorage.`,

  c2Skilled: `Tombol "Edit" pada transaksimu belum berfungsi dengan sempurna. Saat ditekan, form harus secara otomatis terisi dengan data transaksi yang dipilih. Setelah perubahan disimpan, data di layar dan localStorage harus diperbarui, dan form kembali ke mode kosong/tambah.`,

  c2Advanced: `Untuk mencapai kriteria Advanced di bagian pengelolaan data, pastikan kamu memanfaatkan Custom Event. Setiap kali ada perubahan data, kirimkan sinyal menggunakan \`dispatchEvent()\`, lalu gunakan sebuah event listener sentral yang merespons sinyal tersebut untuk merender ulang UI dan memperbarui localStorage.`,

  c3Basic: `Fitur "Ubah Tipe" pada kartu transaksi belum berjalan. Pastikan tombol tersebut dapat mengubah properti tipe transaksi di dalam objek (dari income ke expense, atau sebaliknya) dan memindahkannya ke daftar yang tepat di layar.`,

  c3Skilled: `Fitur pencarian di aplikasimu belum berjalan secara "real-time" saat mengetik. Pastikan kamu menggunakan event listener \`input\` pada kolom pencarian agar daftar transaksi otomatis terfilter seketika, dan pastikan form pencarian tidak memicu page reload (gunakan \`e.preventDefault()\` jika dibungkus tag form).`,

  c3Advanced: `Fitur pencarianmu sudah berjalan, namun ketika input pencarian dikosongkan kembali, daftar transaksi tidak kembali menampilkan seluruh riwayat secara otomatis. Pastikan ada logika yang merender ulang seluruh isi array \`transactions\` saat kata kunci pencarian kosong.`,
};

function copyToClipboard(text) {
  try {
    if (process.platform === "win32") {
      execSync("clip", { input: text });
    } else if (process.platform === "darwin") {
      execSync("pbcopy", { input: text });
    } else {
      execSync("wl-copy", { input: text });
    }
    return true;
  } catch (err) {
    return false;
  }
}

function generateFeedback(report) {
  let feedbackBlocks = [];

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

    if (hasTestIdReject) feedbackBlocks.push(templates.rejectTestId);
    if (hasGreetingReject) feedbackBlocks.push(templates.rejectGreeting);

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
    } else {
      feedbackBlocks.push(
        "Halo! Kerja yang bagus sejauh ini. Aplikasi kamu sudah berjalan, namun masih ada beberapa perbaikan yang perlu dilakukan agar memenuhi seluruh spesifikasi kriteria kelulusan Dicoding:\n",
      );

      if (failedCriteria.includes("Criteria 1 Basic: Render DOM & Lists"))
        feedbackBlocks.push("- " + templates.c1Basic);
      if (failedCriteria.includes("Criteria 1 Skilled: Input Validation"))
        feedbackBlocks.push("- " + templates.c1Skilled);
      if (failedCriteria.includes("Criteria 1 Advanced: Dynamic Dashboard"))
        feedbackBlocks.push("- " + templates.c1Advanced);
      if (failedCriteria.includes("Criteria 2 Basic: LocalStorage & Delete"))
        feedbackBlocks.push("- " + templates.c2Basic);
      if (failedCriteria.includes("Criteria 2 Skilled: Edit Functionality"))
        feedbackBlocks.push("- " + templates.c2Skilled);
      if (failedCriteria.includes("Criteria 2 Advanced: Custom Event Dispatch"))
        feedbackBlocks.push("- " + templates.c2Advanced);
      if (failedCriteria.includes("Criteria 3 Basic: Change Type"))
        feedbackBlocks.push("- " + templates.c3Basic);
      if (failedCriteria.includes("Criteria 3 Skilled: Search Filter"))
        feedbackBlocks.push("- " + templates.c3Skilled);
      if (failedCriteria.includes("Criteria 3 Advanced: Empty Search Restore"))
        feedbackBlocks.push("- " + templates.c3Advanced);

      feedbackBlocks.push(
        "\nSilakan tinjau kembali modul kelas dan sesuaikan logikanya. Saya tunggu submission perbaikannya!",
      );
    }
  }

  const finalFeedback = feedbackBlocks.join("\n\n");
  const isCopied = copyToClipboard(finalFeedback);

  return { finalFeedback, isCopied };
}

module.exports = { generateFeedback };
