/**
 * App.jsx (updated)
 * เพิ่มปุ่ม Dashboard และ import MemberDashboard
 * แทนที่ไฟล์ src/App.jsx ในโปรเจค dankmember
 */

import { useEffect, useState } from "react";
import Papa from "papaparse";
import hero from "./assets/LOGO.JPG";
import text from "./locales/text";
import LanguageSwitcher from "./components/LanguageSwitcher";
import SuccessModal from "./components/SuccessModal";
import MemberDashboard from "./components/MemberDashboard"; // ← เพิ่ม

export default function App() {
  const [phone, setPhone] = useState("");
  const [member, setMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [lang, setLang] = useState("th");
  const t = text[lang] || text.th;
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false); // ← เพิ่ม
  console.log(members);
  // register states
  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    name: "",
    phone: "",
    tier: "Silver",
    email: "",
    gender: "",
    birthdate: "",
  });
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [popup, setPopup] = useState({
    show: false,
    message: "",
    color: "#16a34a",
  });

  // โหลด CSV
  const loadMembers = async () => {
    const response = await fetch(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTwGEAAU2YtXrj9VsS0sLNTeCkAuzSfgYWgyZYjnHWJ7yniymo4_TxIwP1O8P1QHvtYnvlXSuvdE7zP/pub?output=csv",
    );

    const csvText = await response.text();

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          setMembers(result.data);
          resolve(result.data);
        },
      });
    });
  };

  useEffect(() => {
    loadMembers();
  }, []);

  // ── Dashboard shortcut (ถ้าเปิด Dashboard ให้ render แค่ dashboard) ──
  if (showDashboard) {
    return <MemberDashboard onBack={() => setShowDashboard(false)} />;
  }

  // ค้นหาเบอร์
  const normalizePhone = (p) => (p || "").replace(/\D/g, "").replace(/^0/, "");

  const handleSearch = async () => {
    try {
      setSearchLoading(true);
      setShowRegister(false);

      // โหลดข้อมูลล่าสุดจาก Google Sheet
      const latestMembers = await loadMembers();

      const inputPhone = normalizePhone(phone);

      const found = latestMembers.find((m) => {
        const sheetPhone = normalizePhone(m["Phone Number"]);
        return sheetPhone === inputPhone;
      });

      if (found) {
        setMember(found);

        setPopup({
          show: true,
          message: t.found,
          color: "#16a34a",
        });
      } else {
        setMember(null);

        setPopup({
          show: true,
          message: t.notFound,
          color: "#dc2626",
        });
      }

      setTimeout(() => {
        setPopup((prev) => ({
          ...prev,
          show: false,
        }));
      }, 2500);
    } catch (error) {
      console.error(error);

      setPopup({
        show: true,
        message: "เกิดข้อผิดพลาด",
        color: "#dc2626",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  // สมัครสมาชิก
  const handleRegister = async () => {
    // ✅ เช็คกรอกข้อมูล
    if (
      !registerData.name ||
      !registerData.phone ||
      !registerData.gender ||
      !registerData.birthdate
    ) {
      setPopup({
        show: true,
        message: "กรุณากรอกข้อมูลให้ครบ",
        color: "#dc2626",
      });

      return;
    }

    // ✅ normalize เบอร์
    const normalizePhone = (p) => (p || "").replace(/\D/g, "");

    const inputPhone = normalizePhone(registerData.phone);

    // ✅ รองรับเบอร์ต่างประเทศ
    if (!/^\d{7,15}$/.test(inputPhone)) {
      setPopup({
        show: true,
        message: "กรุณากรอกเบอร์โทรให้ถูกต้อง",
        color: "#dc2626",
      });

      return;
    }

    // ✅ เช็ค email เฉพาะตอนกรอก
    if (
      registerData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerData.email)
    ) {
      setPopup({
        show: true,
        message: "รูปแบบอีเมลไม่ถูกต้อง",
        color: "#dc2626",
      });

      return;
    }

    // ✅ เช็คเบอร์ซ้ำ
    const existingMember = members.find(
      (m) => normalizePhone(m["Phone Number"]) === inputPhone,
    );

    if (existingMember) {
      setPopup({
        show: true,
        message: "เบอร์นี้เคยสมัครสมาชิกแล้ว",
        color: "#f59e0b",
      });

      setMember(existingMember);

      setShowRegister(false);

      return;
    }

    try {
      setLoading(true);

      await fetch(
        "https://script.google.com/macros/s/AKfycbxLRvMIVhVH9-K6-SpiDnSnMvNVjcO5wWbv9NOYqzwwzfE-5u-ZAsxKlfkb0IPpI3IA2Q/exec",
        {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "text/plain",
          },
          body: JSON.stringify({
            name: registerData.name,
            phone: registerData.phone,
            tier: registerData.tier,
            email: registerData.email,
            gender: registerData.gender,
            birthdate: registerData.birthdate,
          }),
        },
      );

      const newMember = {
        "Crm Name": registerData.name,
        "Phone Number": registerData.phone,
        "Membership Tier": registerData.tier,
        Points: 0,
        "Total Spending": 0,
      };

      setMembers((prev) => [...prev, newMember]);

      setMember(newMember);

      // ✅ ใส่เบอร์ลงช่องค้นหาอัตโนมัติ
      setPhone(registerData.phone);

      setShowSuccessModal(true);

      setShowRegister(false);

      setRegisterData({
        name: "",
        phone: "",
        tier: "Silver",
        email: "",
        gender: "",
        birthdate: "",
      });

      // auto hide popup
      setTimeout(() => {
        setPopup((prev) => ({
          ...prev,
          show: false,
        }));
      }, 3000);
    } catch (error) {
      console.error("ERROR:", error);

      setPopup({
        show: true,
        message: "เกิดข้อผิดพลาด",
        color: "#dc2626",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f4f5",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          background: "#fff",
          borderRadius: "20px",
          padding: "30px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <LanguageSwitcher lang={lang} setLang={setLang} />
          <img
            src={hero}
            alt=""
            style={{
              width: "120px",
              height: "120px",
              objectFit: "contain",
              marginBottom: "10px",
            }}
          />

          <h1
            style={{
              marginBottom: "30px",
              fontSize: "32px",
              color: "black",
            }}
          >
            DANK MEMBER
          </h1>
          {popup.show && (
            <div
              style={{
                background: popup.color,
                color: "white",
                padding: "12px",
                borderRadius: "12px",
                marginBottom: "20px",
                fontWeight: "bold",
              }}
            >
              {popup.message}
            </div>
          )}

          <label>{t.phone}</label>

          <input
            type="text"
            placeholder="08x-xxx-xxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              width: "95%",
              padding: "14px",
              marginTop: "8px",
              borderRadius: "12px",
              border: "1px solid #ddd",
              fontSize: "18px",
            }}
          />

          <button
            onClick={handleSearch}
            disabled={searchLoading}
            style={{
              width: "100%",
              marginTop: "16px",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background: searchLoading ? "#9ca3af" : "#111827",
              cursor: searchLoading ? "not-allowed" : "pointer",
              color: "white",
              fontSize: "18px",
            }}
          >
            {searchLoading ? t.searching : t.search}
          </button>

          {/* ปุ่มสมัครสมาชิก */}
          <button
            onClick={() => setShowRegister(!showRegister)}
            style={{
              width: "100%",
              marginTop: "10px",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background: "#2563eb",
              color: "white",
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            {t.register}
          </button>

          {/* ── ปุ่ม Dashboard (Staff Only) ── */}
          <button
            onClick={() => setShowDashboard(true)}
            style={{
              width: "100%",
              marginTop: "10px",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background: "#111827",
              color: "#4ade80",
              fontSize: "16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontWeight: 600,
            }}
          >
            📊 Member Dashboard
          </button>

          {/* ฟอร์มสมัคร */}
          {showRegister && (
            <div
              style={{
                marginTop: "25px",
                textAlign: "left",
              }}
            >
              <input
                type="text"
                placeholder={t.name}
                value={registerData.name}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    name: e.target.value,
                  })
                }
                style={{
                  width: "95%",
                  padding: "14px",
                  marginBottom: "10px",
                  borderRadius: "12px",
                  border: "1px solid #ddd",
                }}
              />

              <input
                type="text"
                placeholder={t.phone}
                value={registerData.phone}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    phone: e.target.value,
                  })
                }
                style={{
                  width: "95%",
                  padding: "14px",
                  marginBottom: "10px",
                  borderRadius: "12px",
                  border: "1px solid #ddd",
                }}
              />

              <select
                value={registerData.tier}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    tier: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "14px",
                  marginBottom: "10px",
                  borderRadius: "12px",
                  border: "1px solid #ddd",
                }}
              >
                <option>Silver</option>
                <option>Gold</option>
                <option>VIP</option>
              </select>

              <input
                type="email"
                placeholder={t.email}
                value={registerData.email}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    email: e.target.value,
                  })
                }
                style={{
                  width: "95%",
                  padding: "14px",
                  marginBottom: "10px",
                  borderRadius: "12px",
                  border: "1px solid #ddd",
                }}
              />

              <select
                value={registerData.gender}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    gender: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "14px",
                  marginBottom: "10px",
                  borderRadius: "12px",
                  border: "1px solid #ddd",
                }}
              >
                <option value="">{t.gender}</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>

              <input
                type="date"
                placeholder={t.birthday}
                max={new Date().toISOString().split("T")[0]}
                value={registerData.birthdate}
                onChange={(e) => {
                  const birthdate = e.target.value;

                  const today = new Date();
                  const birth = new Date(birthdate);

                  let age = today.getFullYear() - birth.getFullYear();
                  const monthDiff = today.getMonth() - birth.getMonth();

                  if (
                    monthDiff < 0 ||
                    (monthDiff === 0 && today.getDate() < birth.getDate())
                  ) {
                    age--;
                  }

                  if (age < 20) {
                    alert("อายุไม่ถึงเกณฑ์ (20 ปีขึ้นไป)");
                  }

                  setRegisterData({
                    ...registerData,
                    birthdate,
                  });
                }}
                style={{
                  width: "95%",
                  padding: "14px",
                  marginBottom: "10px",
                  borderRadius: "12px",
                  border: "1px solid #ddd",
                }}
              />

              <button
                onClick={handleRegister}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  border: "none",
                  background: loading ? "#9ca3af" : "#16a34a",
                  color: "white",
                  fontSize: "18px",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? t.registering : t.confirmRegister}
              </button>
            </div>
          )}

          {member && (
            <div
              style={{
                marginTop: "40px",
                border: "1px solid #eee",
                borderRadius: "16px",
                padding: "24px",
                position: "relative",
                background: "#fafafa",
              }}
            >
              <button
                onClick={() => setMember(null)}
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "0",
                  width: "32px",
                  height: "32px",
                  borderRadius: "999px",
                  border: "none",
                  background: "#f3f4f6",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#111827",
                }}
              >
                ✕
              </button>

              <h2 style={{ color: "black" }}>{member["Crm Name"]}</h2>

              <p style={{ color: "black" }}>📞 {member["Phone Number"]}</p>

              <p style={{ color: "black" }}>⭐ {member["Membership Tier"]}</p>

              <p style={{ color: "black" }}>
                🎁 Points: {Number(member["Points"] || 0).toLocaleString()}
              </p>

              <p style={{ color: "black" }}>
                💰 Spend:{" "}
                {Number(member["Total Spending"] || 0).toLocaleString()} บาท
              </p>
            </div>
          )}
        </div>
      </div>
      <SuccessModal
        show={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        lang={lang}
      />
    </div>
  );
}
