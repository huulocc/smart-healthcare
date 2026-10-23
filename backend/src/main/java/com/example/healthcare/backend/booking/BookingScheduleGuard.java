package com.example.healthcare.backend.booking;

import com.example.healthcare.backend.doctor.*;
import org.aopalliance.intercept.MethodInterceptor;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Additive transaction adapter: existing schedule writers participate in booking locks. */
@Configuration
public class BookingScheduleGuard {
    @Bean
    public static BeanPostProcessor bookingScheduleGuardPostProcessor(ObjectProvider<BookingService> booking,
            ObjectProvider<DoctorScheduleRepository> schedules, ObjectProvider<PlatformTransactionManager> managers) {
        return new BeanPostProcessor() {
            @Override public Object postProcessAfterInitialization(Object bean, String name) {
                if (!(bean instanceof AdminScheduleService) && !(bean instanceof AdminDoctorService)) return bean;
                boolean weekly = bean instanceof AdminScheduleService;
                ProxyFactory proxy = new ProxyFactory(bean); proxy.setProxyTargetClass(true);
                proxy.addAdvice((MethodInterceptor) invocation -> {
                    String method = invocation.getMethod().getName();
                    boolean guarded = weekly ? java.util.Set.of("add", "update", "delete").contains(method)
                        : java.util.Set.of("updateStatus", "updateAvailability").contains(method);
                    if (!guarded) return invocation.proceed();
                    return new TransactionTemplate(managers.getObject()).execute(status -> {
                        Long id = (Long) invocation.getArguments()[0];
                        Long doctorId = weekly && !method.equals("add") ? schedules.getObject().findById(id)
                            .map(s -> s.getDoctor().getId()).orElse(null) : id;
                        if (doctorId != null) booking.getObject().lockSchedule(doctorId);
                        if (doctorId != null && weekly && !method.equals("add")) booking.getObject().refreshSchedule(id);
                        try {
                            Object result = invocation.proceed();
                            if (doctorId != null && weekly) booking.getObject().validateSchedule(doctorId);
                            if (doctorId != null && !weekly) booking.getObject().validateDoctorState(doctorId);
                            return result;
                        } catch (RuntimeException | Error ex) { throw ex; }
                        catch (Throwable ex) { throw new IllegalStateException("Schedule change failed", ex); }
                    });
                });
                return proxy.getProxy();
            }
        };
    }
}
