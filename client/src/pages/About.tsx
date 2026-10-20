import { motion } from "framer-motion";

export default function About() {
  return (
    <div className="min-h-screen px-2 py-12 sm:px-4">
      <div className="mx-auto w-full max-w-4xl px-2 sm:px-4 lg:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <h1 className="mb-4 font-display text-4xl font-bold text-white md:text-5xl">เกี่ยวกับระบบ</h1>
          <p className="text-xl text-muted-foreground">ระบบบริหารการจัดการแข่งขันอีสปอร์ต</p>
        </motion.div>

        <div className="space-y-12 leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">วิสัยทัศน์ของระบบ</h2>
            <p>
              ระบบบริหารการจัดการแข่งขันอีสปอร์ตช่วยให้ผู้จัดการแข่งขันและผู้เข้าแข่งขันจัดการข้อมูลได้ในที่เดียว
              ตั้งแต่การประกาศรายการ การสมัครทีม การติดตามสายการแข่งขัน ไปจนถึงการบันทึกผลการแข่งขัน
              เพื่อให้การทำงานเป็นทีม การวางแผน และความสามารถด้านดิจิทัลได้รับการพัฒนาอย่างต่อเนื่อง
            </p>
          </section>

          <section className="rounded-r-xl border-l-4 border-primary bg-primary/5 p-8">
            <h2 className="mb-4 text-2xl font-bold text-white">พันธกิจ</h2>
            <ul className="list-inside list-disc space-y-2">
              <li>ช่วยผู้จัดดูแลรายการแข่งขันและข้อมูลทีมได้ในที่เดียว</li>
              <li>สนับสนุนการแข่งขันที่ได้มาตรฐานและเป็นธรรม</li>
              <li>ส่งเสริมการทำงานเป็นทีมและทักษะดิจิทัลผ่านอีสปอร์ต</li>
              <li>เชื่อมโยงทีม ผู้เข้าแข่งขัน และผู้จัดการแข่งขัน</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-white">ความเป็นมา</h2>
            <p>
              ระบบนี้พัฒนาขึ้นเพื่อเป็นเครื่องมือกลางสำหรับการจัดการแข่งขันเกมออนไลน์
              ช่วยรวบรวมข้อมูลทีม รายการแข่งขัน ผลการแข่งขัน และข่าวสารต่าง ๆ
              ให้ผู้จัดและผู้เข้าแข่งขันติดตามข้อมูลได้สะดวกและเป็นระบบ
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
