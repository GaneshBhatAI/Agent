from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database import Base

class MachinePingLog(Base):
    __tablename__ = "machine_ping_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    machine_id = Column(String(64), index=True, nullable=False)
    status = Column(String(20), nullable=False)
    cpu_usage = Column(Float, nullable=True)
    memory_usage = Column(Float, nullable=True)
    disk_usage = Column(Float, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
