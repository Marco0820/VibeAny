"""
User Request Model
Tracks asynchronous task status for each user instruction.
"""
from sqlalchemy import String, DateTime, ForeignKey, Boolean, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.db.base import Base


class UserRequest(Base):
    """Database table for tracking user requests"""
    __tablename__ = "user_requests"

    # Identifiers
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    
    # Relationships
    project_id: Mapped[str] = mapped_column(
        String(64), 
        ForeignKey("projects.id", ondelete="CASCADE"), 
        index=True, 
        nullable=False
    )
    
    # Link to originating user message (1:1)
    user_message_id: Mapped[str] = mapped_column(
        String(64), 
        ForeignKey("messages.id", ondelete="CASCADE"), 
        unique=True,  # one request per message
        index=True, 
        nullable=False
    )
    
    # Associated CLI session
    session_id: Mapped[str | None] = mapped_column(
        String(64), 
        ForeignKey("sessions.id", ondelete="SET NULL"), 
        index=True
    )
    
    # Request payload
    instruction: Mapped[str] = mapped_column(Text, nullable=False)
    request_type: Mapped[str] = mapped_column(String(16), default="act")  # act, chat
    
    # Completion status
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    is_successful: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # None=pending, True=success, False=failure
    
    # Result metadata
    result_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # CLI information
    cli_type_used: Mapped[str | None] = mapped_column(String(32), nullable=True)
    model_used: Mapped[str | None] = mapped_column(String(64), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    project = relationship("Project", back_populates="user_requests")
    user_message = relationship("Message", foreign_keys=[user_message_id])
    session = relationship("Session", back_populates="user_requests")

    @property
    def duration_ms(self) -> int | None:
        """Return the execution time in milliseconds"""
        if self.started_at and self.completed_at:
            return int((self.completed_at - self.started_at).total_seconds() * 1000)
        return None

    @property 
    def status(self) -> str:
        """Return the request status string"""
        if not self.is_completed:
            return "pending" if not self.started_at else "running"
        elif self.is_successful is True:
            return "completed"
        else:
            return "failed"
            
    def __repr__(self) -> str:
        return f"<UserRequest(id={self.id}, status={self.status}, instruction='{self.instruction[:50]}...')>"
