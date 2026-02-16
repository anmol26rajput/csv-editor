from abc import ABC, abstractmethod

class BaseFileService(ABC):
    @abstractmethod
    def process(self, *args, **kwargs):
        pass
