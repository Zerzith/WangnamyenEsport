import { motion } from "framer-motion";

export default function Privacy() {
  return (
    <div className="min-h-screen py-12 px-2 sm:px-4">
      <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 lg:px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">นโยบายความเป็นส่วนตัว</h1>
          <p className="text-xl text-muted-foreground">การจัดการข้อมูลส่วนบุคคลสำหรับผู้ใช้งาน WNY Esports</p>
        </motion.div>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. ข้อมูลที่เราจัดเก็บ</h2>
            <p>
              ในการใช้งานแพลตฟอร์ม WNY Esports เราอาจจัดเก็บข้อมูลส่วนบุคคลที่จำเป็นสำหรับการจัดการแข่งขัน ได้แก่:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>ข้อมูลบัญชีผู้ใช้ (ชื่อที่แสดง, อีเมล, รูปโปรไฟล์)</li>
              <li>ข้อมูลการสมัครแข่งขัน (ชื่อทีม, รายชื่อสมาชิก, รหัสนักศึกษา)</li>
              <li>ข้อมูลการติดต่อ (เบอร์โทรศัพท์ หรือช่องทางโซเชียลมีเดียที่ระบุ)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. วัตถุประสงค์ในการใช้ข้อมูล</h2>
            <p>เราใช้ข้อมูลของคุณเพื่อวัตถุประสงค์ดังต่อไปนี้:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>เพื่อดำเนินการสมัครและจัดการแข่งขันอีสปอร์ต</li>
              <li>เพื่อแสดงผลการแข่งขันและทำเนียบทีมในหน้าเว็บไซต์</li>
              <li>เพื่อติดต่อประสานงานระหว่างแอดมินและหัวหน้าทีม</li>
              <li>เพื่อปรับปรุงและพัฒนาประสบการณ์การใช้งานเว็บไซต์</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. การเปิดเผยข้อมูล</h2>
            <p>
              ข้อมูลบางส่วน เช่น ชื่อทีม และชื่อผู้เล่น จะถูกแสดงต่อสาธารณะในหน้าตารางคะแนนและทำเนียบทีม 
              อย่างไรก็ตาม ข้อมูลส่วนตัวอื่นๆ เช่น อีเมล หรือรหัสนักศึกษา จะถูกเก็บเป็นความลับและเข้าถึงได้เฉพาะแอดมินผู้ดูแลระบบเท่านั้น
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. ความปลอดภัยของข้อมูล</h2>
            <p>
              เราใช้ระบบรักษาความปลอดภัยที่ได้มาตรฐาน (Firebase Authentication & Firestore Security Rules) 
              เพื่อป้องกันการเข้าถึงข้อมูลโดยไม่ได้รับอนุญาต การแก้ไข หรือการเปิดเผยข้อมูลส่วนบุคคลของคุณ
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. สิทธิ์ของคุณ</h2>
            <p>
              คุณมีสิทธิ์ในการเข้าถึง แก้ไข หรือขอลบข้อมูลส่วนบุคคลของคุณออกจากระบบได้ทุกเมื่อ 
              โดยสามารถดำเนินการผ่านหน้าโปรไฟล์หรือติดต่อแอดมินผ่านช่องทางที่ระบุไว้ในหน้าติดต่อเรา
            </p>
          </section>

          <div className="pt-8 border-t border-white/10 text-sm italic">
            อัปเดตล่าสุดเมื่อ: 1 กุมภาพันธ์ 2569
          </div>
        </div>
      </div>
    </div>
  );
}
