const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Fungsi untuk memproses data saat ada perubahan pada status
exports.processSensorData = functions.database
  .ref("/lpg_concentration/{deviceId}/status")
  .onUpdate(async (change, context) => {
    try {
      const deviceId = context.params.deviceId;
      const newStatus = change.after.val(); // Nilai baru dari status
      const oldStatus = change.before.val(); // Nilai lama dari status

      // Simpan data hanya jika nilai baru berbeda dari nilai lama
      if (newStatus !== oldStatus) {
        // Path untuk konsentrasi LPG yang sesuai dengan deviceId
        const lpgConcentrationPath = `/lpg_concentration/${deviceId}/lpg_concentration_sensor_value`;
        const lpgConcentrationRef = admin.database().ref(lpgConcentrationPath);
        const lpgConcentrationSnapshot = await lpgConcentrationRef.once(
          "value"
        );
        let lpgConcentrationValue = lpgConcentrationSnapshot.val();

        // Tentukan status dan modifikasi nilai jika diperlukan
        let status;
        if (newStatus === "bahaya") {
          status = "KONDISI BAHAYA";
          if (lpgConcentrationValue === null || lpgConcentrationValue < 700) {
            lpgConcentrationValue = 700;
          }
        } else if (newStatus === "siaga") {
          status = "KONDISI SIAGA";
          if (lpgConcentrationValue === null || lpgConcentrationValue < 500) {
            lpgConcentrationValue = 500;
          }
        } else if (newStatus === "aman") {
          status = "KONDISI AMAN";
          if (lpgConcentrationValue === null || lpgConcentrationValue >= 499) {
            lpgConcentrationValue = 499;
          }
        } else {
          status = "STATUS TIDAK DITEMUKAN";
        }

        // Ambil timestamp dalam UTC
        const now = new Date();
        const timestampUTC = admin.firestore.Timestamp.fromDate(now); // Menyimpan sebagai Firestore Timestamp

        // Membuat nama dokumen dengan format UTC
        const timestampString = now.toISOString().replace(/[^a-zA-Z0-9]/g, "_");
        const docName = `${deviceId}_${timestampString}`;

        const data = {
          sensor: deviceId,
          status: status,
          timestamp: timestampUTC,
          value: lpgConcentrationValue,
        };

        // Simpan data ke Firestore
        await admin.firestore().collection(deviceId).doc(docName).set(data);
      }
    } catch (error) {
      console.error("Error processing data:", error);
    }
  });
